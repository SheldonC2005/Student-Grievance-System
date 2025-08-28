const bcrypt = require('bcryptjs');
const { query } = require('../config/sqlite');

const checkUser = async () => {
  try {
    console.log('🔍 Checking user database...');
    
    // Check for student 23MID0031
    const students = await query(
      'SELECT student_id, email, full_name, created_at FROM users WHERE student_id = ?',
      ['23MID0031']
    );
    
    if (students.length > 0) {
      console.log('✅ Student found in database:');
      console.log('   Student ID:', students[0].student_id);
      console.log('   Email:', students[0].email);
      console.log('   Full Name:', students[0].full_name);
      console.log('   Created:', students[0].created_at);
      
      // Reset password to known value
      const saltRounds = 12;
      const newPasswordHash = await bcrypt.hash('password123', saltRounds);
      
      await query(
        'UPDATE users SET password_hash = ? WHERE student_id = ?',
        [newPasswordHash, '23MID0031']
      );
      
      console.log('🔒 Password reset to: password123');
    } else {
      console.log('❌ Student 23MID0031 not found in database');
      
      // Create the student
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash('password123', saltRounds);
      
      await query(
        `INSERT INTO users (student_id, email, password_hash, full_name, role) 
         VALUES (?, ?, ?, ?, ?)`,
        ['23MID0031', 'student23@example.com', passwordHash, 'Student 23MID0031', 'student']
      );
      
      console.log('✅ Student created with password: password123');
    }
    
    // List all users for debugging
    const allUsers = await query('SELECT student_id, email, full_name FROM users');
    console.log('\n📋 All users in database:');
    allUsers.forEach(user => {
      console.log(`   ${user.student_id} - ${user.full_name} (${user.email})`);
    });
    
  } catch (error) {
    console.error('❌ Error checking user:', error);
  }
};

checkUser().then(() => {
  console.log('\n✅ Database check completed');
  process.exit(0);
});
