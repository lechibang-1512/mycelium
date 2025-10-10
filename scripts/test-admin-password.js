const mariadb = require('mariadb');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function testLogin() {
  const pool = mariadb.createPool({
    host: process.env.AUTH_DB_HOST || '127.0.0.1',
    port: process.env.AUTH_DB_PORT || 3306,
    user: process.env.AUTH_DB_USER,
    password: process.env.AUTH_DB_PASSWORD,
    database: process.env.AUTH_DB_NAME || 'security_db'
  });
  
  try {
    console.log('🔐 Testing admin login credentials...\n');
    const conn = await pool.getConnection();
    const users = await conn.query('SELECT id, username, password, is_active FROM users WHERE username = ?', ['admin']);
    
    if (users.length === 0) {
      console.log('❌ Admin user not found!');
      conn.end();
      await pool.end();
      return;
    }
    
    const user = users[0];
    const testPassword = 'admin123';
    
    console.log('Testing credentials:');
    console.log(`   Username: admin`);
    console.log(`   Password: ${testPassword}`);
    console.log(`   User Active: ${user.is_active ? 'YES' : 'NO'}`);
    console.log();
    
    // Test password
    console.log('🔑 Comparing password...');
    const passwordMatch = await bcrypt.compare(testPassword, user.password);
    
    if (passwordMatch) {
      console.log('✅ Password matches! Login should work.');
    } else {
      console.log('❌ Password does NOT match!');
      console.log('\n🔧 Recreating password hash...');
      
      const newHash = await bcrypt.hash(testPassword, 12);
      await conn.query('UPDATE users SET password = ? WHERE username = ?', [newHash, 'admin']);
      
      console.log('✅ Password hash updated. Please try logging in again.');
    }
    
    conn.end();
    await pool.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

testLogin();
