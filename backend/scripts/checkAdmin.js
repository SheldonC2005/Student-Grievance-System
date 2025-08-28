const bcrypt = require('bcryptjs');
const { query } = require('../config/sqlite');

const checkAdmin = async () => {
  try {
    console.log('🔍 Checking admin database...');
    
    // Check for admin001
    const admins = await query(
      'SELECT admin_id, email, full_name, permissions, is_active, created_at FROM admins WHERE admin_id = ?',
      ['admin001']
    );
    
    if (admins.length > 0) {
      console.log('✅ Admin found in database:');
      console.log('   Admin ID:', admins[0].admin_id);
      console.log('   Email:', admins[0].email);
      console.log('   Full Name:', admins[0].full_name);
      console.log('   Permissions:', admins[0].permissions);
      console.log('   Active:', admins[0].is_active);
      console.log('   Created:', admins[0].created_at);
      
      // Reset password to known value
      const saltRounds = 12;
      const newPasswordHash = await bcrypt.hash('admin123', saltRounds);
      
      await query(
        'UPDATE admins SET password_hash = ?, is_active = 1 WHERE admin_id = ?',
        [newPasswordHash, 'admin001']
      );
      
      console.log('🔒 Admin password reset to: admin123');
      console.log('✅ Admin account activated');
    } else {
      console.log('❌ Admin admin001 not found in database');
      
      // Create the admin
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash('admin123', saltRounds);
      
      await query(
        `INSERT INTO admins (admin_id, email, password_hash, full_name, permissions, is_active) 
         VALUES (?, ?, ?, ?, ?, 1)`,
        ['admin001', 'admin@example.com', passwordHash, 'Default Admin', 'block_create,block_view,complaint_manage']
      );
      
      console.log('✅ Admin created with password: admin123');
    }
    
    // List all admins for debugging
    const allAdmins = await query('SELECT admin_id, email, full_name, is_active FROM admins');
    console.log('\n📋 All admins in database:');
    allAdmins.forEach(admin => {
      console.log(`   ${admin.admin_id} - ${admin.full_name} (${admin.email}) [Active: ${admin.is_active}]`);
    });
    
    // Test password hash verification
    console.log('\n🧪 Testing password verification...');
    const testAdmin = await query('SELECT password_hash FROM admins WHERE admin_id = ?', ['admin001']);
    if (testAdmin.length > 0) {
      const isValid = await bcrypt.compare('admin123', testAdmin[0].password_hash);
      console.log('   Password verification result:', isValid ? '✅ VALID' : '❌ INVALID');
    }
    
  } catch (error) {
    console.error('❌ Error checking admin:', error);
  }
};

checkAdmin().then(() => {
  console.log('\n✅ Admin database check completed');
  process.exit(0);
});
