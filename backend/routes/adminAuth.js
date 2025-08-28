const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/sqlite');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

/**
 * Admin registration endpoint
 * POST /api/admin/auth/register
 */
router.post('/register', async (req, res) => {
  try {
    const { admin_id, email, password, full_name, permissions } = req.body;

    // Validation
    if (!admin_id || !email || !password || !full_name) {
      return res.status(400).json({ 
        error: 'Missing required fields: admin_id, email, password, full_name' 
      });
    }

    // Check if admin already exists
    const existingAdmin = await query(
      'SELECT id FROM admins WHERE admin_id = ? OR email = ?',
      [admin_id, email]
    );

    if (existingAdmin.length > 0) {
      return res.status(409).json({ 
        error: 'Admin with this ID or email already exists' 
      });
    }

    // Hash password
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Insert new admin
    const result = await query(`
      INSERT INTO admins (
        admin_id, email, password_hash, full_name, permissions, is_active
      ) VALUES (?, ?, ?, ?, ?, 1)
    `, [
      admin_id,
      email,
      password_hash,
      full_name,
      permissions || 'block_create,block_view,complaint_manage'
    ]);

    console.log(`👨‍💼 New admin registered: ${admin_id} (${full_name})`);

    res.status(201).json({
      success: true,
      message: 'Admin registered successfully',
      admin: {
        id: result.insertId,
        admin_id,
        email,
        full_name,
        permissions: permissions || 'block_create,block_view,complaint_manage'
      }
    });

  } catch (error) {
    console.error('❌ Admin registration error:', error);
    res.status(500).json({ 
      error: 'Internal server error during admin registration' 
    });
  }
});

/**
 * Admin login endpoint
 * POST /api/admin/auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { admin_id, adminId, email, password } = req.body;
    
    console.log('🔍 Admin login attempt:', { admin_id, adminId, email, password: password ? '[PROVIDED]' : '[MISSING]' });

    // Support both camelCase (adminId) and snake_case (admin_id) formats
    const adminIdentifier = admin_id || adminId;

    // Validation
    if ((!adminIdentifier && !email) || !password) {
      console.log('❌ Validation failed: Missing credentials');
      return res.status(400).json({ 
        error: 'Admin ID/email and password are required' 
      });
    }

    // Find admin
    const whereClause = adminIdentifier ? 'admin_id = ?' : 'email = ?';
    const whereValue = adminIdentifier || email;
    
    console.log('🔍 Searching for admin with:', { whereClause, whereValue });

    const adminResult = await query(`
      SELECT 
        id, admin_id, email, password_hash, full_name, 
        permissions, is_active, created_at
      FROM admins 
      WHERE ${whereClause} AND is_active = 1
    `, [whereValue]);

    console.log('🔍 Admin search result:', adminResult.length > 0 ? 'FOUND' : 'NOT FOUND');

    if (adminResult.length === 0) {
      console.log('❌ Admin not found or inactive');
      return res.status(401).json({ 
        error: 'Invalid credentials or admin account disabled' 
      });
    }

    const admin = adminResult[0];
    console.log('✅ Admin found:', { admin_id: admin.admin_id, email: admin.email, is_active: admin.is_active });

    // Verify password
    const validPassword = await bcrypt.compare(password, admin.password_hash);
    console.log('🔒 Password verification:', validPassword ? 'VALID' : 'INVALID');
    
    if (!validPassword) {
      console.log('❌ Invalid password for admin:', admin.admin_id);
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      });
    }

    // Generate JWT token
    const tokenPayload = {
      id: admin.id,
      admin_id: admin.admin_id,
      email: admin.email,
      role: 'admin',
      permissions: admin.permissions.split(',')
    };

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      { expiresIn: '8h' } // 8-hour session for admins
    );

    // Update last login (you might want to add this field to schema)
    await query(
      'UPDATE admins SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [admin.id]
    );

    console.log(`🔐 Admin login successful: ${admin.admin_id}`);

    res.json({
      success: true,
      message: 'Admin login successful',
      token,
      admin: {
        id: admin.id,
        admin_id: admin.admin_id,
        email: admin.email,
        full_name: admin.full_name,
        permissions: admin.permissions.split(','),
        created_at: admin.created_at
      }
    });

  } catch (error) {
    console.error('❌ Admin login error:', error);
    res.status(500).json({ 
      error: 'Internal server error during admin login' 
    });
  }
});

/**
 * Get admin profile
 * GET /api/admin/auth/profile
 */
router.get('/profile', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const adminResult = await query(`
      SELECT 
        id, admin_id, email, full_name, permissions, 
        is_active, created_at, updated_at
      FROM admins 
      WHERE id = ?
    `, [req.user.id]);

    if (adminResult.length === 0) {
      return res.status(404).json({ 
        error: 'Admin profile not found' 
      });
    }

    const admin = adminResult[0];

    res.json({
      success: true,
      admin: {
        ...admin,
        permissions: admin.permissions.split(',')
      }
    });

  } catch (error) {
    console.error('❌ Error fetching admin profile:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

/**
 * Update admin profile
 * PUT /api/admin/auth/profile
 */
router.put('/profile', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { full_name, email } = req.body;
    const adminId = req.user.id;

    if (!full_name && !email) {
      return res.status(400).json({ 
        error: 'At least one field (full_name, email) is required for update' 
      });
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];

    if (full_name) {
      updateFields.push('full_name = ?');
      updateValues.push(full_name);
    }

    if (email) {
      // Check if email is already used by another admin
      const existingAdmin = await query(
        'SELECT id FROM admins WHERE email = ? AND id != ?',
        [email, adminId]
      );

      if (existingAdmin.length > 0) {
        return res.status(409).json({ 
          error: 'Email already used by another admin' 
        });
      }

      updateFields.push('email = ?');
      updateValues.push(email);
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(adminId);

    await query(`
      UPDATE admins 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `, updateValues);

    console.log(`📝 Admin profile updated: ${req.user.admin_id}`);

    res.json({
      success: true,
      message: 'Admin profile updated successfully'
    });

  } catch (error) {
    console.error('❌ Error updating admin profile:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

/**
 * Change admin password
 * PUT /api/admin/auth/password
 */
router.put('/password', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const adminId = req.user.id;

    if (!current_password || !new_password) {
      return res.status(400).json({ 
        error: 'Current password and new password are required' 
      });
    }

    if (new_password.length < 8) {
      return res.status(400).json({ 
        error: 'New password must be at least 8 characters long' 
      });
    }

    // Get current password hash
    const adminResult = await query(
      'SELECT password_hash FROM admins WHERE id = ?',
      [adminId]
    );

    if (adminResult.length === 0) {
      return res.status(404).json({ 
        error: 'Admin not found' 
      });
    }

    // Verify current password
    const validPassword = await bcrypt.compare(current_password, adminResult[0].password_hash);
    if (!validPassword) {
      return res.status(401).json({ 
        error: 'Current password is incorrect' 
      });
    }

    // Hash new password
    const saltRounds = 12;
    const new_password_hash = await bcrypt.hash(new_password, saltRounds);

    // Update password
    await query(`
      UPDATE admins 
      SET password_hash = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, [new_password_hash, adminId]);

    console.log(`🔒 Admin password changed: ${req.user.admin_id}`);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('❌ Error changing admin password:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

/**
 * Admin logout (invalidate token - client-side mainly)
 * POST /api/admin/auth/logout
 */
router.post('/logout', authenticateToken, requireRole(['admin']), (req, res) => {
  try {
    console.log(`👋 Admin logout: ${req.user.admin_id}`);
    
    // Note: With JWT, we can't really "invalidate" the token server-side 
    // without maintaining a blacklist. The client should delete the token.
    res.json({
      success: true,
      message: 'Admin logged out successfully'
    });

  } catch (error) {
    console.error('❌ Error during admin logout:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

/**
 * Verify admin token and permissions
 * GET /api/admin/auth/verify
 */
router.get('/verify', authenticateToken, requireRole(['admin']), (req, res) => {
  try {
    res.json({
      success: true,
      valid: true,
      admin: {
        id: req.user.id,
        admin_id: req.user.admin_id,
        email: req.user.email,
        permissions: req.user.permissions
      }
    });

  } catch (error) {
    console.error('❌ Error verifying admin token:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

module.exports = router;
