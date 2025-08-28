const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/sqlite');
const router = express.Router();

// Register new user
router.post('/register', [
  body('studentId').notEmpty().withMessage('Student ID is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('fullName').notEmpty().withMessage('Full name is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { studentId, email, password, fullName, walletAddress } = req.body;

    // Check if user already exists
    const existingUser = await query(
      'SELECT * FROM users WHERE student_id = ? OR email = ?',
      [studentId, email]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({ 
        error: 'User already exists with this student ID or email' 
      });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert new user
    const result = await query(
      `INSERT INTO users (student_id, email, password_hash, full_name, wallet_address) 
       VALUES (?, ?, ?, ?, ?)`,
      [studentId, email, passwordHash, fullName, walletAddress || null]
    );

    // Get the created user
    const newUser = await query(
      'SELECT id, student_id, email, full_name, role, created_at FROM users WHERE id = ?',
      [result.insertId]
    );

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser[0].id, studentId: newUser[0].student_id },
      process.env.JWT_SECRET || 'default-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: newUser[0],
      token
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: 'Registration failed. Please try again.',
      details: error.message 
    });
  }
});

// Login user
router.post('/login', [
  body('identifier').notEmpty().withMessage('Student ID or email is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { identifier, password } = req.body;

    // Find user by student ID or email
    const users = await query(
      'SELECT * FROM users WHERE student_id = ? OR email = ?',
      [identifier, identifier]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, studentId: user.student_id },
      process.env.JWT_SECRET || 'default-secret-key',
      { expiresIn: '24h' }
    );

    // Return user data (excluding password)
    const userData = {
      id: user.id,
      studentId: user.student_id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      walletAddress: user.wallet_address,
      createdAt: user.created_at
    };

    res.json({
      success: true,
      message: 'Login successful',
      user: userData,
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Login failed. Please try again.' 
    });
  }
});

// MetaMask login
router.post('/metamask-login', [
  body('walletAddress').notEmpty().withMessage('Wallet address is required'),
  body('signature').notEmpty().withMessage('Signature is required'),
  body('message').notEmpty().withMessage('Message is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { walletAddress, signature, message } = req.body;

    // Find user by wallet address
    let users = await query(
      'SELECT * FROM users WHERE wallet_address = ?',
      [walletAddress]
    );

    let user;
    if (users.length === 0) {
      // Create new user with wallet address
      const result = await query(
        `INSERT INTO users (student_id, email, password_hash, full_name, wallet_address, role) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          `wallet_${walletAddress.slice(-8)}`, // Generate student ID from wallet
          `${walletAddress}@wallet.local`, // Generate email
          'metamask_auth', // Placeholder password hash
          'MetaMask User',
          walletAddress,
          'student'
        ]
      );

      const newUsers = await query(
        'SELECT * FROM users WHERE id = ?',
        [result.insertId]
      );
      user = newUsers[0];
    } else {
      user = users[0];
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, studentId: user.student_id },
      process.env.JWT_SECRET || 'default-secret-key',
      { expiresIn: '24h' }
    );

    // Return user data
    const userData = {
      id: user.id,
      studentId: user.student_id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      walletAddress: user.wallet_address,
      createdAt: user.created_at
    };

    res.json({
      success: true,
      message: 'MetaMask login successful',
      user: userData,
      token
    });

  } catch (error) {
    console.error('MetaMask login error:', error);
    res.status(500).json({ 
      error: 'MetaMask login failed. Please try again.' 
    });
  }
});

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid token.' });
  }
};

// Get current user profile
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const users = await query(
      'SELECT id, student_id, email, full_name, role, wallet_address, created_at FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    res.json({
      success: true,
      user: {
        id: user.id,
        studentId: user.student_id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        walletAddress: user.wallet_address,
        createdAt: user.created_at
      }
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

module.exports = router;
