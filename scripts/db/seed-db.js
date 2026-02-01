const { exec } = require('child_process');
const path = require('path');
require('dotenv').config();

const DB_CONFIG = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 3306
};

const SCHEMAS = [
    {
        name: 'security_db',
        file: path.join(__dirname, '../sql/security_db_export.sql')
    },
    {
        name: 'master_db',
        file: path.join(__dirname, '../sql/master_db_export.sql')
    }
];

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

async function seedDatabase() {
    console.log('🌱 Starting Database Seeding (using MariaDB CLI)...\n');

    try {
        // 1. Create Databases
        console.log('--- Creating Databases ---\n');
        for (const schema of SCHEMAS) {
            console.log(`Creating database: ${schema.name}...\n`);
            // Use -e to execute SQL
            const createDbCmd = `mariadb -h ${DB_CONFIG.host} -P ${DB_CONFIG.port} -u ${DB_CONFIG.user} -e \"CREATE DATABASE IF NOT EXISTS 
${schema.name}
\";`;
            await runCommand(createDbCmd, { MYSQL_PWD: DB_CONFIG.password });
            console.log(`✓ Database ${schema.name} ready.\n`);
        }

        // 2. Import Schemas
        console.log('--- Importing Schemas & Seed Data ---\n');
        for (const schema of SCHEMAS) {
            console.log(`Importing to ${schema.name} from ${path.basename(schema.file)}...\n`);
            
            // Construct import command: mariadb ... db_name < file.sql
            // Note: input redirection < works in shell, so we exec the string directly.
            const importCmd = `mariadb -h ${DB_CONFIG.host} -P ${DB_CONFIG.port} -u ${DB_CONFIG.user} ${schema.name} < \"${schema.file}\"`;
            
            await runCommand(importCmd, { MYSQL_PWD: DB_CONFIG.password });
            console.log(`✓ Imported ${schema.name}.\n`);
        }

        console.log('✅ Database seeding completed successfully!\n');

    } catch (error) {
        console.error('\n❌ Seeding failed:', error.message);
        process.exit(1);
    }
}

seedDatabase();
