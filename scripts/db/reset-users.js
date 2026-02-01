const { exec } = require('child_process');
const path = require('path');
require('dotenv').config();

const DB_CONFIG = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 3306
};

const SECURITY_DB_SCHEMA = path.join(__dirname, '../sql/security_db_export.sql');
const INIT_RBAC_SCRIPT = path.join(__dirname, 'init-rbac.js');

// Helper to run shell command
function runCommand(command, env = {}) {
    return new Promise((resolve, reject) => {
        exec(command, { env: { ...process.env, ...env } }, (error, stdout, stderr) => {
            if (error) {
                // mask password in error message if present
                let maskedMsg = error.message;
                if (DB_CONFIG.password) {
                     maskedMsg = maskedMsg.replace(new RegExp(DB_CONFIG.password, 'g'), '*****');
                }
                reject(new Error(maskedMsg));
                return;
            }
            resolve(stdout);
        });
    });
}

async function resetUsers() {
    console.log('🔄 Resetting Users (Security DB)...\n');

    try {
        // 1. Restore Security DB
        console.log('--- Restoring Security Database ---\n');
        console.log(`Importing to security_db from ${path.basename(SECURITY_DB_SCHEMA)}...\n`);
        
        const createDbCmd = `mariadb -h ${DB_CONFIG.host} -P ${DB_CONFIG.port} -u ${DB_CONFIG.user} -e "CREATE DATABASE IF NOT EXISTS security_db"`;
        await runCommand(createDbCmd, { MYSQL_PWD: DB_CONFIG.password });

        const importCmd = `mariadb -h ${DB_CONFIG.host} -P ${DB_CONFIG.port} -u ${DB_CONFIG.user} security_db < "${SECURITY_DB_SCHEMA}"`;
        await runCommand(importCmd, { MYSQL_PWD: DB_CONFIG.password });
        console.log('✓ Security DB restored.\n');

        // 2. Run Init RBAC to ensure all default users are present
        console.log('--- Running RBAC Initialization ---\n');
        // We can require and run the function, or exec the script. 
        // Executing the script ensures clean environment.
        const rbacCmd = `node "${INIT_RBAC_SCRIPT}"`;
        const rbacOutput = await runCommand(rbacCmd);
        console.log(rbacOutput);
        console.log('✓ RBAC Initialization complete.\n');

        console.log('✅ Users reset successfully!\n');

    } catch (error) {
        console.error('\n❌ Reset failed:', error.message);
        process.exit(1);
    }
}

resetUsers();
