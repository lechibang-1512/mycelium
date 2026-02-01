const mariadb = require('mariadb');
require('dotenv').config();

const pool = mariadb.createPool({
    host: process.env.AUTH_DB_HOST || process.env.DB_HOST,
    user: process.env.AUTH_DB_USER || process.env.DB_USER,
    password: process.env.AUTH_DB_PASSWORD || process.env.DB_PASSWORD,
    database: 'security_db',
    port: process.env.AUTH_DB_PORT || process.env.DB_PORT || 3306
});

async function checkUser() {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query("SELECT id, username, password, role, is_active FROM users WHERE username = 'admin'");
        console.log('User found:', rows);

        if (rows.length > 0) {
            const bcrypt = require('bcryptjs');
            const match = await bcrypt.compare('admin123', rows[0].password);
            console.log('Password "admin123" matches:', match);
        }
    } catch (err) {
        console.error(err);
    } finally {
        if (conn) conn.release();
        await pool.end();
    }
}

checkUser();
