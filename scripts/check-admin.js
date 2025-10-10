const mariadb = require('mariadb');
require('dotenv').config();

async function checkAdmin() {
  const pool = mariadb.createPool({
    host: process.env.AUTH_DB_HOST || '127.0.0.1',
    port: process.env.AUTH_DB_PORT || 3306,
    user: process.env.AUTH_DB_USER,
    password: process.env.AUTH_DB_PASSWORD,
    database: process.env.AUTH_DB_NAME || 'security_db'
  });
  
  try {
    console.log('🔍 Checking admin user...\n');
    const conn = await pool.getConnection();
    const users = await conn.query('SELECT id, username, fullName, email, role, is_active, locked_until, failed_login_attempts, created_at FROM users WHERE username = ?', ['admin']);
    
    if (users.length === 0) {
      console.log('❌ Admin user not found!');
    } else {
      console.log('✅ Admin user found:');
      console.table(users);
      
      const user = users[0];
      console.log('\n📊 Status Check:');
      console.log(`   ✓ Active: ${user.is_active ? '✅ YES' : '❌ NO'}`);
      console.log(`   ✓ Locked: ${user.locked_until && new Date(user.locked_until) > new Date() ? '🔒 YES' : '✅ NO'}`);
      console.log(`   ✓ Failed Attempts: ${user.failed_login_attempts}`);
      
      if (!user.is_active) {
        console.log('\n⚠️  WARNING: Admin account is INACTIVE! Activating now...');
        await conn.query('UPDATE users SET is_active = 1 WHERE username = ?', ['admin']);
        console.log('✅ Admin account activated!');
      }
      
      if (user.failed_login_attempts > 0 || (user.locked_until && new Date(user.locked_until) > new Date())) {
        console.log('\n⚠️  WARNING: Admin account has failed attempts or is locked! Resetting...');
        await conn.query('UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE username = ?', ['admin']);
        console.log('✅ Admin account unlocked!');
      }
    }
    
    conn.end();
    await pool.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

checkAdmin();
