#!/usr/bin/env node

/**
 * Setup script for Password Reset feature
 * This script will:
 * 1. Install nodemailer package
 * 2. Run database migration to create password_reset_tokens table
 * 3. Create .env template if it doesn't exist
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const mariadb = require('mariadb');
require('dotenv').config();

async function runMigration() {
    console.log('\n📊 Running database migration...');
    
    try {
        const pool = mariadb.createPool({
            host: process.env.AUTH_DB_HOST || 'localhost',
            user: process.env.AUTH_DB_USER || 'root',
            password: process.env.AUTH_DB_PASSWORD || '',
            database: process.env.AUTH_DB_NAME || 'security_db',
            connectionLimit: 5
        });

        const conn = await pool.getConnection();
        
        // Read and execute migration
        const migrationPath = path.join(__dirname, '..', 'sql', 'migrations', '001_add_password_reset_tokens.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // Split by semicolons and filter out comments and empty statements
        const statements = migrationSQL
            .split(';')
            .map(s => s.trim())
            .filter(s => s && !s.startsWith('--'));
        
        for (const statement of statements) {
            if (statement) {
                await conn.query(statement);
            }
        }
        
        console.log('✅ Database migration completed successfully');
        
        conn.release();
        await pool.end();
    } catch (err) {
        console.error('❌ Error running migration:', err);
        throw err;
    }
}

function createEnvTemplate() {
    console.log('\n📝 Checking .env configuration...');
    
    const envPath = path.join(__dirname, '..', '.env');
    const envExamplePath = path.join(__dirname, '..', '.env.example');
    
    const emailEnvVars = `
# Email Configuration (for password reset functionality)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM="Inventory Management" <noreply@inventory.com>
`;

    // Check if .env exists
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        
        // Check if email config already exists
        if (!envContent.includes('SMTP_HOST')) {
            console.log('⚠️  Adding email configuration to .env file...');
            fs.appendFileSync(envPath, emailEnvVars);
            console.log('✅ Email configuration added to .env');
            console.log('📌 Remember to update SMTP credentials in .env file!');
        } else {
            console.log('✅ Email configuration already exists in .env');
        }
    } else {
        console.log('⚠️  .env file not found. Please create one with the required variables.');
    }
    
    // Update .env.example if it exists
    if (fs.existsSync(envExamplePath)) {
        const envExampleContent = fs.readFileSync(envExamplePath, 'utf8');
        if (!envExampleContent.includes('SMTP_HOST')) {
            fs.appendFileSync(envExamplePath, emailEnvVars);
            console.log('✅ Email configuration added to .env.example');
        }
    }
}

async function main() {
    console.log('🚀 Setting up Password Reset Feature...\n');
    
    try {
        // Step 1: Install nodemailer
        console.log('📦 Installing nodemailer package...');
        try {
            execSync('npm install nodemailer', { stdio: 'inherit' });
            console.log('✅ nodemailer installed successfully');
        } catch (err) {
            console.error('❌ Error installing nodemailer:', err.message);
            throw err;
        }
        
        // Step 2: Run database migration
        await runMigration();
        
        // Step 3: Create .env template
        createEnvTemplate();
        
        console.log('\n✨ Password Reset Feature setup completed successfully!\n');
        console.log('📋 Next steps:');
        console.log('   1. Update SMTP credentials in your .env file');
        console.log('   2. Test the email service with: node -e "require(\'./services/EmailService\').verifyConnection()"');
        console.log('   3. Restart your server to load the new routes');
        console.log('\n💡 For development, the reset URL will be logged to console');
        console.log('   In production, configure proper SMTP settings to send emails\n');
        
    } catch (err) {
        console.error('\n❌ Setup failed:', err.message);
        process.exit(1);
    }
}

// Run the setup
main();
