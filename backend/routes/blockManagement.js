const express = require('express');
const { blockService } = require('../services/blockService');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

/**
 * Get block creation preview
 * GET /api/admin/blocks/preview
 */
router.get('/preview', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    console.log(`👀 Block preview requested by admin: ${req.user.admin_id}`);

    const preview = await blockService.getBlockCreationPreview();

    res.json({
      success: true,
      preview
    });

  } catch (error) {
    console.error('❌ Error generating block preview:', error);
    res.status(500).json({
      error: 'Failed to generate block preview',
      details: error.message
    });
  }
});

/**
 * Create a new complaint block
 * POST /api/admin/blocks/create
 */
router.post('/create', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    console.log(`🏗️ Block creation requested by admin: ${req.user.admin_id}`);

    // Check if admin has block creation permission
    if (!req.user.permissions.includes('block_create')) {
      return res.status(403).json({
        error: 'Insufficient permissions for block creation'
      });
    }

    const result = await blockService.createBlock(req.user.id);

    res.json({
      success: true,
      message: 'Block created successfully',
      block: {
        id: result.blockId,
        number: result.blockNumber,
        merkleRoot: result.merkleRoot,
        complaintCount: result.complaintCount,
        topCategory: result.topCategory,
        totalPriorityScore: result.totalPriorityScore,
        processingTime: result.processingTime,
        ipfsMetadataHash: result.ipfsMetadataHash
      }
    });

  } catch (error) {
    console.error('❌ Error creating block:', error);
    
    if (error.message.includes('No unprocessed complaints')) {
      return res.status(400).json({
        error: 'No unprocessed complaints found',
        message: 'There are no new complaints to include in a block. Please wait for new complaints to be submitted.'
      });
    }

    res.status(500).json({
      error: 'Failed to create block',
      details: error.message
    });
  }
});

/**
 * Get all blocks with pagination
 * GET /api/admin/blocks
 */
router.get('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    console.log(`📋 Blocks list requested by admin: ${req.user.admin_id} (page: ${page})`);

    const blocks = await blockService.getAllBlocks(limit, offset);

    res.json({
      success: true,
      blocks,
      pagination: {
        page,
        limit,
        hasMore: blocks.length === limit
      }
    });

  } catch (error) {
    console.error('❌ Error fetching blocks:', error);
    res.status(500).json({
      error: 'Failed to fetch blocks',
      details: error.message
    });
  }
});

/**
 * Get detailed information about a specific block
 * GET /api/admin/blocks/:blockNumber
 */
router.get('/:blockNumber', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const blockNumber = parseInt(req.params.blockNumber);

    if (isNaN(blockNumber) || blockNumber < 1) {
      return res.status(400).json({
        error: 'Invalid block number'
      });
    }

    console.log(`🔍 Block details requested: ${blockNumber} by admin: ${req.user.admin_id}`);

    const blockDetails = await blockService.getBlockDetails(blockNumber);

    res.json({
      success: true,
      block: blockDetails
    });

  } catch (error) {
    console.error('❌ Error fetching block details:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Block not found',
        details: error.message
      });
    }

    res.status(500).json({
      error: 'Failed to fetch block details',
      details: error.message
    });
  }
});

/**
 * Get block statistics
 * GET /api/admin/blocks/stats/overview
 */
router.get('/stats/overview', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    console.log(`📊 Block statistics requested by admin: ${req.user.admin_id}`);

    const { query } = require('../config/sqlite');

    // Get overall statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_blocks,
        SUM(complaint_count) as total_complaints_processed,
        AVG(complaint_count) as avg_complaints_per_block,
        MAX(block_number) as latest_block_number,
        MIN(created_at) as first_block_created,
        MAX(created_at) as latest_block_created
      FROM block_metadata
    `;

    const stats = await query(statsQuery);

    // Get category distribution
    const categoryStatsQuery = `
      SELECT 
        top_category,
        COUNT(*) as block_count,
        SUM(complaint_count) as total_complaints,
        AVG(total_priority_score) as avg_priority_score
      FROM block_metadata 
      WHERE top_category IS NOT NULL
      GROUP BY top_category
      ORDER BY block_count DESC
    `;

    const categoryStats = await query(categoryStatsQuery);

    // Get recent activity
    const recentActivityQuery = `
      SELECT 
        bm.block_number,
        bm.complaint_count,
        bm.top_category,
        bm.created_at,
        a.admin_id,
        a.full_name as admin_name
      FROM block_metadata bm
      LEFT JOIN admins a ON bm.created_by_admin_id = a.id
      ORDER BY bm.created_at DESC
      LIMIT 5
    `;

    const recentActivity = await query(recentActivityQuery);

    // Get unprocessed complaints count
    const unprocessedPreview = await blockService.getBlockCreationPreview();

    res.json({
      success: true,
      statistics: {
        overview: stats[0],
        categoryDistribution: categoryStats,
        recentActivity,
        pendingComplaints: {
          count: unprocessedPreview.hasComplaints ? unprocessedPreview.complaintCount : 0,
          canCreateBlock: unprocessedPreview.hasComplaints
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching block statistics:', error);
    res.status(500).json({
      error: 'Failed to fetch block statistics',
      details: error.message
    });
  }
});

/**
 * Search blocks by criteria
 * GET /api/admin/blocks/search
 */
router.get('/search', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { category, admin_id, from_date, to_date, min_complaints, max_complaints } = req.query;

    console.log(`🔍 Block search requested by admin: ${req.user.admin_id}`);

    const { query } = require('../config/sqlite');

    let whereConditions = [];
    let queryParams = [];

    if (category) {
      whereConditions.push('bm.top_category = ?');
      queryParams.push(category);
    }

    if (admin_id) {
      whereConditions.push('a.admin_id = ?');
      queryParams.push(admin_id);
    }

    if (from_date) {
      whereConditions.push('bm.created_at >= ?');
      queryParams.push(from_date);
    }

    if (to_date) {
      whereConditions.push('bm.created_at <= ?');
      queryParams.push(to_date);
    }

    if (min_complaints) {
      whereConditions.push('bm.complaint_count >= ?');
      queryParams.push(parseInt(min_complaints));
    }

    if (max_complaints) {
      whereConditions.push('bm.complaint_count <= ?');
      queryParams.push(parseInt(max_complaints));
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const searchQuery = `
      SELECT 
        bm.*,
        a.admin_id,
        a.full_name as admin_name
      FROM block_metadata bm
      LEFT JOIN admins a ON bm.created_by_admin_id = a.id
      ${whereClause}
      ORDER BY bm.block_number DESC
      LIMIT 50
    `;

    const results = await query(searchQuery, queryParams);

    res.json({
      success: true,
      results,
      searchCriteria: req.query,
      count: results.length
    });

  } catch (error) {
    console.error('❌ Error searching blocks:', error);
    res.status(500).json({
      error: 'Failed to search blocks',
      details: error.message
    });
  }
});

/**
 * Export block data for analysis
 * GET /api/admin/blocks/:blockNumber/export
 */
router.get('/:blockNumber/export', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const blockNumber = parseInt(req.params.blockNumber);

    if (isNaN(blockNumber) || blockNumber < 1) {
      return res.status(400).json({
        error: 'Invalid block number'
      });
    }

    console.log(`📤 Block export requested: ${blockNumber} by admin: ${req.user.admin_id}`);

    const blockDetails = await blockService.getBlockDetails(blockNumber);

    // Prepare export data
    const exportData = {
      blockInfo: {
        number: blockDetails.block_number,
        merkleRoot: blockDetails.merkle_root,
        complaintCount: blockDetails.complaint_count,
        topCategory: blockDetails.top_category,
        totalPriorityScore: blockDetails.total_priority_score,
        createdAt: blockDetails.created_at,
        createdBy: blockDetails.admin_name
      },
      complaints: blockDetails.complaints.map(complaint => ({
        id: complaint.complaint_id,
        title: complaint.title,
        category: complaint.category,
        status: complaint.status,
        inclusionOrder: complaint.inclusion_order,
        hash: complaint.complaint_hash,
        createdAt: complaint.created_at
      })),
      categoryStats: blockDetails.categoryStats,
      sentimentStats: blockDetails.sentimentStats,
      exportedAt: new Date().toISOString(),
      exportedBy: req.user.admin_id
    };

    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="block_${blockNumber}_export.json"`);

    res.json(exportData);

  } catch (error) {
    console.error('❌ Error exporting block:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Block not found',
        details: error.message
      });
    }

    res.status(500).json({
      error: 'Failed to export block',
      details: error.message
    });
  }
});

module.exports = router;
