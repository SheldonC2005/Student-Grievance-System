const { query } = require('../config/sqlite');
const { merkleTreeService } = require('./merkleTreeService');
const { generateComplaintInsights } = require('./aiService');
const { ipfsService } = require('./ipfsService');

/**
 * Block Service for creating and managing complaint blocks
 * Includes AI-powered classification and weighted priority calculation
 */
class BlockService {
  constructor() {
    this.sentimentMultipliers = {
      critical: 3,  // sentiment < 0.3
      high: 2,      // sentiment 0.3-0.6
      normal: 1     // sentiment > 0.6
    };
  }

  /**
   * Get sentiment severity multiplier based on sentiment score
   * @param {number} sentimentScore - Sentiment score (0-1)
   * @returns {number} Severity multiplier
   */
  getSentimentMultiplier(sentimentScore) {
    if (sentimentScore < 0.3) return this.sentimentMultipliers.critical;
    if (sentimentScore < 0.6) return this.sentimentMultipliers.high;
    return this.sentimentMultipliers.normal;
  }

  /**
   * Get unprocessed complaints since last block
   * @returns {Array} Array of unprocessed complaints
   */
  async getUnprocessedComplaints() {
    try {
      console.log('📋 Fetching unprocessed complaints...');

      // Get timestamp of last block creation
      const lastBlockQuery = `
        SELECT MAX(created_at) as last_block_time 
        FROM block_metadata
      `;
      const lastBlockResult = await query(lastBlockQuery);
      const lastBlockTime = lastBlockResult[0]?.last_block_time || '1970-01-01 00:00:00';

      // Get complaints created after last block
      const complaintsQuery = `
        SELECT 
          c.id,
          c.student_id,
          c.title,
          c.description,
          c.category,
          c.priority,
          c.status,
          c.ipfs_hash,
          c.ai_sentiment,
          c.similarity_score,
          c.created_at
        FROM complaints c
        WHERE c.created_at > ? 
          AND c.id NOT IN (
            SELECT cb.complaint_id 
            FROM complaint_blocks cb
          )
        ORDER BY c.created_at ASC
      `;

      const complaints = await query(complaintsQuery, [lastBlockTime]);
      
      console.log(`📊 Found ${complaints.length} unprocessed complaints since ${lastBlockTime}`);
      return complaints;

    } catch (error) {
      console.error('❌ Error fetching unprocessed complaints:', error);
      throw error;
    }
  }

  /**
   * Classify and analyze complaints using AI
   * @param {Array} complaints - Array of complaint objects
   * @returns {Object} Classification results with grouped complaints and statistics
   */
  async classifyComplaints(complaints) {
    try {
      console.log(`🤖 Starting AI classification for ${complaints.length} complaints...`);

      const classificationResults = {
        categoryGroups: {},
        sentimentStats: {
          critical: [],
          high: [],
          normal: []
        },
        totalPriorityScore: 0,
        topCategory: null,
        processedComplaints: []
      };

      for (const complaint of complaints) {
        // Generate AI insights if not already present
        let sentimentScore = complaint.ai_sentiment;
        
        if (sentimentScore === null || sentimentScore === undefined) {
          console.log(`🔍 Generating AI insights for complaint ${complaint.id}...`);
          const insights = await generateComplaintInsights(complaint.description, complaint.category);
          sentimentScore = insights.sentimentScore;
          
          // Update complaint with AI insights
          await query(
            'UPDATE complaints SET ai_sentiment = ?, similarity_score = ? WHERE id = ?',
            [sentimentScore, insights.similarComplaints.length > 0 ? insights.similarComplaints[0].similarity : 0, complaint.id]
          );
        }

        // Calculate weighted priority score
        const sentimentMultiplier = this.getSentimentMultiplier(sentimentScore);
        const priorityScore = sentimentMultiplier;

        // Group by category
        if (!classificationResults.categoryGroups[complaint.category]) {
          classificationResults.categoryGroups[complaint.category] = {
            complaints: [],
            count: 0,
            totalPriorityScore: 0,
            averageSentiment: 0,
            sentimentBreakdown: { critical: 0, high: 0, normal: 0 }
          };
        }

        const categoryGroup = classificationResults.categoryGroups[complaint.category];
        categoryGroup.complaints.push(complaint);
        categoryGroup.count++;
        categoryGroup.totalPriorityScore += priorityScore;

        // Track sentiment distribution
        if (sentimentScore < 0.3) {
          categoryGroup.sentimentBreakdown.critical++;
          classificationResults.sentimentStats.critical.push(complaint);
        } else if (sentimentScore < 0.6) {
          categoryGroup.sentimentBreakdown.high++;
          classificationResults.sentimentStats.high.push(complaint);
        } else {
          categoryGroup.sentimentBreakdown.normal++;
          classificationResults.sentimentStats.normal.push(complaint);
        }

        // Add to processed complaints
        classificationResults.processedComplaints.push({
          ...complaint,
          sentimentScore,
          sentimentMultiplier,
          priorityScore,
          sqliteRowId: complaint.id
        });

        classificationResults.totalPriorityScore += priorityScore;
      }

      // Calculate weighted priority scores for categories (Count × Average Sentiment Severity)
      let topCategoryScore = 0;
      let topCategory = null;

      for (const [category, group] of Object.entries(classificationResults.categoryGroups)) {
        group.averageSentiment = group.totalPriorityScore / group.count;
        const weightedScore = group.count * group.averageSentiment;
        
        if (weightedScore > topCategoryScore) {
          topCategoryScore = weightedScore;
          topCategory = category;
        }

        console.log(`📈 Category: ${category}`);
        console.log(`   📊 Count: ${group.count}`);
        console.log(`   🎯 Weighted Score: ${weightedScore.toFixed(2)}`);
        console.log(`   💭 Avg Sentiment: ${group.averageSentiment.toFixed(2)}`);
      }

      classificationResults.topCategory = topCategory;

      console.log(`✅ AI Classification completed:`);
      console.log(`   🏆 Top Category: ${topCategory} (score: ${topCategoryScore.toFixed(2)})`);
      console.log(`   📊 Total Categories: ${Object.keys(classificationResults.categoryGroups).length}`);
      console.log(`   💯 Total Priority Score: ${classificationResults.totalPriorityScore.toFixed(2)}`);

      return classificationResults;

    } catch (error) {
      console.error('❌ Error in AI classification:', error);
      throw error;
    }
  }

  /**
   * Create a new complaint block
   * @param {number} adminId - ID of the admin creating the block
   * @returns {Object} Block creation result
   */
  async createBlock(adminId) {
    try {
      console.log(`🏗️ Starting block creation by admin ${adminId}...`);

      // Step 1: Get unprocessed complaints
      const complaints = await this.getUnprocessedComplaints();
      
      if (complaints.length === 0) {
        throw new Error('No unprocessed complaints found. Cannot create block.');
      }

      const startTime = Date.now();

      // Step 2: Classify complaints using AI
      const classificationResults = await this.classifyComplaints(complaints);

      // Step 3: Build Merkle tree
      console.log('🌳 Building Merkle tree...');
      const merkleTree = merkleTreeService.buildMerkleTree(classificationResults.processedComplaints);

      if (!merkleTreeService.validateMerkleTree(merkleTree)) {
        throw new Error('Invalid Merkle tree generated');
      }

      // Step 4: Upload classification metadata to IPFS
      const blockMetadata = {
        complaintCount: complaints.length,
        categoryStats: classificationResults.categoryGroups,
        sentimentStats: classificationResults.sentimentStats,
        topCategory: classificationResults.topCategory,
        totalPriorityScore: classificationResults.totalPriorityScore,
        merkleTreeStats: merkleTreeService.getTreeStats(merkleTree),
        createdAt: new Date().toISOString()
      };

      let ipfsMetadataHash = '';
      try {
        ipfsMetadataHash = await ipfsService.uploadJSON(blockMetadata);
        console.log(`📁 Block metadata uploaded to IPFS: ${ipfsMetadataHash}`);
      } catch (ipfsError) {
        console.warn('⚠️ IPFS upload failed, continuing without metadata hash:', ipfsError.message);
      }

      // Step 5: Get next block number
      const blockNumberQuery = 'SELECT COALESCE(MAX(block_number), 0) + 1 as next_block_number FROM block_metadata';
      const blockNumberResult = await query(blockNumberQuery);
      const blockNumber = blockNumberResult[0].next_block_number;

      // Step 6: Save block metadata to database
      const blockInsertResult = await query(`
        INSERT INTO block_metadata (
          block_number, merkle_root, complaint_count, total_priority_score,
          top_category, category_stats, sentiment_stats, created_by_admin_id,
          ipfs_metadata_hash
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        blockNumber,
        merkleTree.root,
        complaints.length,
        classificationResults.totalPriorityScore,
        classificationResults.topCategory,
        JSON.stringify(classificationResults.categoryGroups),
        JSON.stringify(classificationResults.sentimentStats),
        adminId,
        ipfsMetadataHash
      ]);

      const blockId = blockInsertResult.insertId;

      // Step 7: Record complaint-block relationships
      console.log('💾 Recording complaint-block relationships...');
      for (let i = 0; i < classificationResults.processedComplaints.length; i++) {
        const complaint = classificationResults.processedComplaints[i];
        const complaintHash = merkleTreeService.hashComplaint(complaint);
        
        await query(`
          INSERT INTO complaint_blocks (
            block_id, complaint_id, complaint_hash, inclusion_order
          ) VALUES (?, ?, ?, ?)
        `, [blockId, complaint.id, complaintHash, i]);
      }

      // Step 8: Log block creation
      const processingTime = Date.now() - startTime;
      await query(`
        INSERT INTO block_creation_log (
          admin_id, block_id, complaints_processed, processing_time_ms,
          merkle_tree_depth, classification_summary
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        adminId,
        blockId,
        complaints.length,
        processingTime,
        merkleTree.depth,
        JSON.stringify({
          topCategory: classificationResults.topCategory,
          totalCategories: Object.keys(classificationResults.categoryGroups).length,
          sentimentBreakdown: Object.keys(classificationResults.sentimentStats).map(key => ({
            level: key,
            count: classificationResults.sentimentStats[key].length
          }))
        })
      ]);

      console.log(`✅ Block ${blockNumber} created successfully!`);
      console.log(`   📦 Block ID: ${blockId}`);
      console.log(`   🔐 Merkle Root: ${merkleTree.root}`);
      console.log(`   ⏱️ Processing Time: ${processingTime}ms`);

      return {
        success: true,
        blockId,
        blockNumber,
        merkleRoot: merkleTree.root,
        complaintCount: complaints.length,
        topCategory: classificationResults.topCategory,
        totalPriorityScore: classificationResults.totalPriorityScore,
        processingTime,
        ipfsMetadataHash,
        merkleTree,
        classificationResults
      };

    } catch (error) {
      console.error('❌ Error creating block:', error);
      throw error;
    }
  }

  /**
   * Get block creation preview without actually creating the block
   * @returns {Object} Preview of what would be included in the next block
   */
  async getBlockCreationPreview() {
    try {
      console.log('👀 Generating block creation preview...');

      const complaints = await this.getUnprocessedComplaints();
      
      if (complaints.length === 0) {
        return {
          hasComplaints: false,
          message: 'No unprocessed complaints found'
        };
      }

      const classificationResults = await this.classifyComplaints(complaints);

      // Create categoryStats object that frontend expects
      const categoryStats = {};
      Object.keys(classificationResults.categoryGroups).forEach(category => {
        categoryStats[category] = classificationResults.categoryGroups[category].count;
      });

      return {
        hasComplaints: true,
        complaintCount: complaints.length,
        topCategory: classificationResults.topCategory,
        totalPriorityScore: classificationResults.totalPriorityScore,
        // Frontend expects categoryStats as object for Object.entries()
        categoryStats: categoryStats,
        // Frontend expects sentimentStats with this structure
        sentimentStats: {
          critical: classificationResults.sentimentStats.critical.length,
          high: classificationResults.sentimentStats.high.length,
          normal: classificationResults.sentimentStats.normal.length
        },
        // Keep legacy structure for backwards compatibility
        categoryBreakdown: Object.keys(classificationResults.categoryGroups).map(category => ({
          category,
          count: classificationResults.categoryGroups[category].count,
          priorityScore: classificationResults.categoryGroups[category].totalPriorityScore,
          averageSentiment: classificationResults.categoryGroups[category].averageSentiment
        })),
        sentimentBreakdown: {
          critical: classificationResults.sentimentStats.critical.length,
          high: classificationResults.sentimentStats.high.length,
          normal: classificationResults.sentimentStats.normal.length
        },
        complaints: complaints.map(complaint => ({
          id: complaint.id,
          title: complaint.title,
          category: complaint.category,
          created_at: complaint.created_at,
          sentiment: complaint.ai_sentiment
        }))
      };

    } catch (error) {
      console.error('❌ Error generating block preview:', error);
      throw error;
    }
  }

  /**
   * Get all blocks with metadata
   * @param {number} limit - Maximum number of blocks to return
   * @param {number} offset - Offset for pagination
   * @returns {Array} Array of block information
   */
  async getAllBlocks(limit = 10, offset = 0) {
    try {
      const blocksQuery = `
        SELECT 
          bm.*,
          a.admin_id,
          a.full_name as admin_name,
          COUNT(cb.complaint_id) as actual_complaint_count
        FROM block_metadata bm
        LEFT JOIN admins a ON bm.created_by_admin_id = a.id
        LEFT JOIN complaint_blocks cb ON bm.id = cb.block_id
        GROUP BY bm.id
        ORDER BY bm.block_number DESC
        LIMIT ? OFFSET ?
      `;

      const blocks = await query(blocksQuery, [limit, offset]);
      return blocks;

    } catch (error) {
      console.error('❌ Error fetching blocks:', error);
      throw error;
    }
  }

  /**
   * Get block details by block number
   * @param {number} blockNumber - Block number to fetch
   * @returns {Object} Detailed block information
   */
  async getBlockDetails(blockNumber) {
    try {
      const blockQuery = `
        SELECT 
          bm.*,
          a.admin_id,
          a.full_name as admin_name
        FROM block_metadata bm
        LEFT JOIN admins a ON bm.created_by_admin_id = a.id
        WHERE bm.block_number = ?
      `;

      const blockResult = await query(blockQuery, [blockNumber]);
      
      if (blockResult.length === 0) {
        throw new Error(`Block ${blockNumber} not found`);
      }

      const block = blockResult[0];

      // Get complaints in this block
      const complaintsQuery = `
        SELECT 
          cb.*,
          c.title,
          c.description,
          c.category,
          c.status,
          c.created_at
        FROM complaint_blocks cb
        JOIN complaints c ON cb.complaint_id = c.id
        WHERE cb.block_id = ?
        ORDER BY cb.inclusion_order ASC
      `;

      const complaints = await query(complaintsQuery, [block.id]);

      return {
        ...block,
        complaints,
        categoryStats: JSON.parse(block.category_stats || '{}'),
        sentimentStats: JSON.parse(block.sentiment_stats || '{}')
      };

    } catch (error) {
      console.error('❌ Error fetching block details:', error);
      throw error;
    }
  }

  /**
   * Get all blocks with pagination
   */
  async getAllBlocks(limit = 10, offset = 0) {
    try {
      const blocksQuery = `
        SELECT 
          bm.*,
          a.admin_id,
          a.full_name as admin_name
        FROM block_metadata bm
        LEFT JOIN admins a ON bm.created_by_admin_id = a.id
        ORDER BY bm.block_number DESC
        LIMIT ? OFFSET ?
      `;

      const blocks = await query(blocksQuery, [limit, offset]);

      return blocks.map(block => ({
        ...block,
        created_at: new Date(block.created_at).toISOString(),
        // Parse JSON fields if they're stored as strings
        category_stats: typeof block.category_stats === 'string' 
          ? JSON.parse(block.category_stats) 
          : block.category_stats,
        sentiment_stats: typeof block.sentiment_stats === 'string' 
          ? JSON.parse(block.sentiment_stats) 
          : block.sentiment_stats
      }));

    } catch (error) {
      console.error('❌ Error fetching blocks:', error);
      throw new Error(`Failed to fetch blocks: ${error.message}`);
    }
  }

  /**
   * Get detailed information about a specific block
   */
  async getBlockDetails(blockNumber) {
    try {
      // Get block metadata
      const blockQuery = `
        SELECT 
          bm.*,
          a.admin_id,
          a.full_name as admin_name
        FROM block_metadata bm
        LEFT JOIN admins a ON bm.created_by_admin_id = a.id
        WHERE bm.block_number = ?
      `;

      const blockData = await query(blockQuery, [blockNumber]);

      if (blockData.length === 0) {
        throw new Error(`Block ${blockNumber} not found`);
      }

      const block = blockData[0];

      // Get complaints in this block
      const complaintsQuery = `
        SELECT 
          cb.*,
          c.title,
          c.category,
          c.status,
          c.created_at
        FROM complaint_blocks cb
        INNER JOIN complaints c ON cb.complaint_id = c.id
        WHERE cb.block_number = ?
        ORDER BY cb.inclusion_order ASC
      `;

      const complaints = await query(complaintsQuery, [blockNumber]);

      // Parse JSON fields
      const categoryStats = typeof block.category_stats === 'string' 
        ? JSON.parse(block.category_stats) 
        : block.category_stats;
      
      const sentimentStats = typeof block.sentiment_stats === 'string' 
        ? JSON.parse(block.sentiment_stats) 
        : block.sentiment_stats;

      return {
        ...block,
        created_at: new Date(block.created_at).toISOString(),
        categoryStats,
        sentimentStats,
        complaints: complaints.map(complaint => ({
          ...complaint,
          created_at: new Date(complaint.created_at).toISOString()
        }))
      };

    } catch (error) {
      console.error('❌ Error fetching block details:', error);
      throw new Error(`Failed to fetch block details: ${error.message}`);
    }
  }
}

module.exports = {
  BlockService,
  blockService: new BlockService()
};
