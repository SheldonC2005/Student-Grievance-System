const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/sqlite');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { analyzeSentiment, findSimilarComplaints } = require('../services/aiService');
const { ipfsService } = require('../services/ipfsService');
const { blockchainService } = require('../services/blockchainService');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/admin-responses');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `admin-response-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only image files
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'default-secret-key', (err, user) => {
    if (err) {
      console.error('Token verification error:', err);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Get all complaints (for ledger view)
router.get('/', async (req, res) => {
  try {
    const { category, priority, status, studentId } = req.query;
    
    let queryStr = `
      SELECT c.*, u.full_name, u.student_id as student_identifier
      FROM complaints c 
      JOIN users u ON c.student_id = u.student_id 
      WHERE 1=1
    `;
    const queryParams = [];

    if (category) {
      queryStr += ` AND c.category = ?`;
      queryParams.push(category);
    }

    if (priority) {
      queryStr += ` AND c.priority = ?`;
      queryParams.push(priority);
    }

    if (status) {
      queryStr += ` AND c.status = ?`;
      queryParams.push(status);
    }

    if (studentId) {
      queryStr += ` AND c.student_id = ?`;
      queryParams.push(studentId);
    }

    queryStr += ' ORDER BY c.created_at DESC';

    const complaints = await query(queryStr, queryParams);

    res.json({
      success: true,
      complaints: complaints,
      total: complaints.length
    });

  } catch (error) {
    console.error('Get complaints error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch complaints',
      details: error.message 
    });
  }
});

// Get user's complaints
router.get('/my-complaints', authenticateToken, async (req, res) => {
  try {
    const userComplaints = await query(
      `SELECT c.*, u.full_name 
       FROM complaints c 
       JOIN users u ON c.student_id = u.student_id 
       WHERE u.id = ? 
       ORDER BY c.created_at DESC`,
      [req.user.userId]
    );

    res.json({
      success: true,
      complaints: userComplaints
    });

  } catch (error) {
    console.error('Get user complaints error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch your complaints' 
    });
  }
});

// Submit new complaint
router.post('/submit', [
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('category').notEmpty().withMessage('Category is required')
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, category, priority = 'medium', attachments } = req.body;

    // Get user details
    const users = await query(
      'SELECT student_id FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const studentId = users[0].student_id;

    // AI Analysis
    let sentimentScore = 0;
    let similarityScore = 0;
    
    try {
      // Analyze sentiment
      sentimentScore = await analyzeSentiment(description);

      // Check for similar complaints
      const similarComplaints = await findSimilarComplaints(description, category);
      if (similarComplaints.length > 0) {
        similarityScore = similarComplaints[0].similarity;
      }
    } catch (aiError) {
      console.warn('AI analysis failed, continuing without it:', aiError.message);
    }

    // Upload to IPFS
    let ipfsHash = '';
    try {
      const complaintData = {
        title,
        description,
        category,
        studentId,
        timestamp: new Date().toISOString(),
        attachments: attachments || []
      };
      
      const ipfsResult = await ipfsService.uploadComplaint(complaintData);
      ipfsHash = ipfsResult.hash;
      console.log('📡 Complaint uploaded to IPFS:', ipfsHash);
    } catch (ipfsError) {
      console.warn('IPFS upload failed, continuing without it:', ipfsError.message);
      ipfsHash = 'mock_hash_' + Date.now();
    }

    // Submit to blockchain
    let blockchainHash = '';
    let blockchainId = 0;
    
    try {
      const complaintData = {
        title,
        description,
        category,
        priority,
        student_id: studentId,
        timestamp: new Date().toISOString()
      };
      
      const complaintResult = await blockchainService.submitComplaint(complaintData);
      
      blockchainHash = complaintResult.transactionHash;
      blockchainId = complaintResult.complaintId;
      console.log('🔗 Complaint submitted to blockchain:', blockchainHash);
    } catch (blockchainError) {
      console.warn('Blockchain submission failed, continuing without it:', blockchainError.message);
      blockchainHash = 'mock_blockchain_' + Date.now();
      blockchainId = Math.floor(Math.random() * 1000);
    }

    // Store in SQLite database
    const result = await query(
      `INSERT INTO complaints (
        student_id, title, description, category, priority, status,
        blockchain_hash, blockchain_id, ipfs_hash, ai_sentiment, similarity_score
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        studentId, title, description, category, priority, 'pending',
        blockchainHash, blockchainId, ipfsHash, sentimentScore, similarityScore
      ]
    );

    // Get the created complaint
    const newComplaint = await query(
      `SELECT c.*, u.full_name 
       FROM complaints c 
       JOIN users u ON c.student_id = u.student_id 
       WHERE c.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully',
      complaint: newComplaint[0],
      analysis: {
        sentiment: sentimentScore,
        similarity: similarityScore,
        blockchainHash,
        ipfsHash
      }
    });

  } catch (error) {
    console.error('Submit complaint error:', error);
    res.status(500).json({ 
      error: 'Failed to submit complaint. Please try again.',
      details: error.message 
    });
  }
});

// Get complaint by ID
router.get('/:id', async (req, res) => {
  try {
    const complaintId = req.params.id;
    
    const complaints = await query(
      `SELECT c.*, u.full_name, u.student_id as student_identifier
       FROM complaints c 
       JOIN users u ON c.student_id = u.student_id 
       WHERE c.id = ?`,
      [complaintId]
    );

    if (complaints.length === 0) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    res.json({
      success: true,
      complaint: complaints[0]
    });

  } catch (error) {
    console.error('Get complaint error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch complaint' 
    });
  }
});

// Escalate complaint (admin only for now)
router.patch('/:id/escalate', authenticateToken, async (req, res) => {
  try {
    const complaintId = req.params.id;
    const { newPriority = 'high' } = req.body;

    // Get current complaint
    const complaints = await query(
      'SELECT * FROM complaints WHERE id = ?',
      [complaintId]
    );

    if (complaints.length === 0) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    const complaint = complaints[0];

    // Update priority
    await query(
      'UPDATE complaints SET priority = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newPriority, complaintId]
    );

    // Try blockchain escalation (mock for now)
    try {
      await escalateComplaintOnBlockchain(complaint.blockchain_id, newPriority);
    } catch (blockchainError) {
      console.warn('Blockchain escalation failed:', blockchainError.message);
    }

    res.json({
      success: true,
      message: 'Complaint escalated successfully'
    });

  } catch (error) {
    console.error('Escalate complaint error:', error);
    res.status(500).json({ 
      error: 'Failed to escalate complaint' 
    });
  }
});

// Update complaint status (admin only for now)
router.patch('/:id/status', authenticateToken, upload.single('adminImage'), async (req, res) => {
  try {
    const complaintId = req.params.id;
    const { status, adminMessage } = req.body;

    // Validate status values
    const validStatuses = ['SUBMITTED', 'IN_PROGRESS', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED', 'REJECTED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      });
    }

    // Get the complaint to get blockchain_id
    const complaints = await query(
      'SELECT blockchain_id FROM complaints WHERE id = ?',
      [complaintId]
    );

    if (complaints.length === 0) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    const blockchainId = complaints[0].blockchain_id;

    // Prepare update data
    let updateQuery = 'UPDATE complaints SET status = ?, updated_at = CURRENT_TIMESTAMP';
    let updateParams = [status];

    // Add admin message if provided
    if (adminMessage && adminMessage.trim()) {
      updateQuery += ', admin_message = ?';
      updateParams.push(adminMessage.trim());
    }

    // Add admin image path if uploaded
    if (req.file) {
      const relativePath = `uploads/admin-responses/${req.file.filename}`;
      updateQuery += ', admin_image_path = ?';
      updateParams.push(relativePath);
    }

    updateQuery += ' WHERE id = ?';
    updateParams.push(complaintId);

    // Update status in database
    await query(updateQuery, updateParams);

    // Update status on blockchain
    try {
      await blockchainService.updateComplaintStatus(blockchainId, status);
      console.log('🔗 Complaint status updated on blockchain:', blockchainId, status);
    } catch (blockchainError) {
      console.warn('Blockchain status update failed:', blockchainError.message);
    }

    res.json({
      success: true,
      message: 'Complaint status updated successfully',
      data: {
        complaintId,
        status,
        adminMessage: adminMessage || null,
        adminImageUploaded: !!req.file
      }
    });

  } catch (error) {
    console.error('Update status error:', error);
    
    // Clean up uploaded file if there was an error
    if (req.file) {
      fs.unlink(req.file.path, (unlinkErr) => {
        if (unlinkErr) console.error('Error deleting file:', unlinkErr);
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to update complaint status' 
    });
  }
});

// Serve admin response images
router.get('/admin-response-image/:filename', (req, res) => {
  const filename = req.params.filename;
  const imagePath = path.join(__dirname, '../../uploads/admin-responses', filename);
  
  // Check if file exists
  if (!fs.existsSync(imagePath)) {
    return res.status(404).json({ error: 'Image not found' });
  }
  
  // Serve the image
  res.sendFile(imagePath);
});

// Real-time sentiment analysis endpoint
router.post('/analyze-sentiment', [
  body('text').notEmpty().withMessage('Text is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { text } = req.body;
    
    // Analyze sentiment
    const sentimentScore = await analyzeSentiment(text);
    
    // Determine sentiment category
    let sentiment = 'neutral';
    let color = 'secondary';
    
    if (sentimentScore < 0.3) {
      sentiment = 'negative';
      color = 'danger';
    } else if (sentimentScore > 0.7) {
      sentiment = 'positive';
      color = 'success';
    }
    
    // Analyze urgency keywords
    const urgencyKeywords = ['urgent', 'emergency', 'serious', 'critical', 'immediate', 'asap'];
    const hasUrgency = urgencyKeywords.some(keyword => 
      text.toLowerCase().includes(keyword)
    );
    
    // Analyze detail level
    const wordCount = text.trim().split(/\s+/).length;
    let detailLevel = 'minimal';
    if (wordCount > 50) detailLevel = 'good';
    if (wordCount > 100) detailLevel = 'detailed';
    if (wordCount > 200) detailLevel = 'comprehensive';
    
    res.json({
      sentiment: {
        score: sentimentScore,
        label: sentiment,
        color: color
      },
      urgency: {
        detected: hasUrgency,
        level: hasUrgency ? 'high' : 'normal'
      },
      analysis: {
        wordCount: wordCount,
        detailLevel: detailLevel,
        readabilityScore: Math.min(100, Math.max(0, (wordCount / 2) + (sentimentScore * 50)))
      }
    });

  } catch (error) {
    console.error('Sentiment analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze sentiment',
      details: error.message 
    });
  }
});

module.exports = router;
