const bcrypt = require('bcryptjs');
const { query } = require('../config/sqlite');

const createDefaultUsers = async () => {
  try {
    console.log('🔧 Creating default users...');
    
    // Check if default student already exists
    const existingStudent = await query(
      'SELECT * FROM users WHERE student_id = ?',
      ['23MID0031']
    );
    
    if (existingStudent.length === 0) {
      // Create default student
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash('password123', saltRounds);
      
      await query(
        `INSERT INTO users (student_id, email, password_hash, full_name, role) 
         VALUES (?, ?, ?, ?, ?)`,
        ['23MID0031', 'student@example.com', passwordHash, 'Test Student', 'student']
      );
      
      console.log('✅ Default student created:');
      console.log('   Student ID: 23MID0031');
      console.log('   Password: password123');
      console.log('   Email: student@example.com');
    } else {
      console.log('ℹ️ Default student already exists');
    }
    
    // Check if default admin already exists
    const existingAdmin = await query(
      'SELECT * FROM admins WHERE admin_id = ?',
      ['admin001']
    );
    
    if (existingAdmin.length === 0) {
      // Create default admin
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash('admin123', saltRounds);
      
      await query(
        `INSERT INTO admins (admin_id, email, password_hash, full_name, permissions, is_active) 
         VALUES (?, ?, ?, ?, ?, 1)`,
        ['admin001', 'admin@example.com', passwordHash, 'Test Admin', 'block_create,block_view,complaint_manage']
      );
      
      console.log('✅ Default admin created:');
      console.log('   Admin ID: admin001');
      console.log('   Password: admin123');
      console.log('   Email: admin@example.com');
    } else {
      console.log('ℹ️ Default admin already exists');
    }
    
  } catch (error) {
    console.error('❌ Error creating default users:', error);
  }
};

module.exports = { createDefaultUsers };
