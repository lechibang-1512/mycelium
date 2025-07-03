#!/usr/bin/env node

/**
 * Environment Configuration Verification Script
 * 
 * This script verifies that all required environment variables are properly set
 * and tests database connections to ensure everything is working correctly.
 */

// Load environment variables
require('dotenv').config();

const mariadb = require('mariadb');

// Colors for console output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

const log = {
    success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
    warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
    info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
    header: (msg) => console.log(`${colors.bold}${colors.blue}${msg}${colors.reset}`)
};

// Required environment variables
const requiredEnvVars = [
    { name: 'DB_USER', description: 'Main database username' },
    { name: 'DB_PASSWORD', description: 'Main database password' },
    { name: 'SUPPLIERS_DB_USER', description: 'Suppliers database username' },
    { name: 'SUPPLIERS_DB_PASSWORD', description: 'Suppliers database password' },
    { name: 'AUTH_DB_USER', description: 'Authentication database username' },
    { name: 'AUTH_DB_PASSWORD', description: 'Authentication database password' },
    { name: 'SESSION_SECRET', description: 'Session encryption secret' }
];

// Optional but recommended environment variables
const optionalEnvVars = [
    { name: 'DB_HOST', description: 'Main database host', default: '127.0.0.1' },
    { name: 'DB_PORT', description: 'Main database port', default: '3306' },
    { name: 'DB_NAME', description: 'Main database name', default: 'master_specs_db' },
    { name: 'SUPPLIERS_DB_HOST', description: 'Suppliers database host', default: '127.0.0.1' },
    { name: 'SUPPLIERS_DB_PORT', description: 'Suppliers database port', default: '3306' },
    { name: 'SUPPLIERS_DB_NAME', description: 'Suppliers database name', default: 'suppliers_db' },
    { name: 'AUTH_DB_HOST', description: 'Auth database host', default: '127.0.0.1' },
    { name: 'AUTH_DB_PORT', description: 'Auth database port', default: '3306' },
    { name: 'AUTH_DB_NAME', description: 'Auth database name', default: 'users_db' },
    { name: 'PORT', description: 'Server port', default: '3000' },
    { name: 'NODE_ENV', description: 'Node environment', default: 'development' }
];

async function verifyEnvironmentVariables() {
    log.header('\n🔍 VERIFYING ENVIRONMENT VARIABLES\n');
    
    let allValid = true;
    
    // Check required variables
    log.info('Checking required environment variables:');
    for (const envVar of requiredEnvVars) {
        if (process.env[envVar.name]) {
            log.success(`${envVar.name}: Set (${envVar.description})`);
        } else {
            log.error(`${envVar.name}: MISSING - ${envVar.description}`);
            allValid = false;
        }
    }
    
    console.log('');
    
    // Check optional variables
    log.info('Checking optional environment variables:');
    for (const envVar of optionalEnvVars) {
        if (process.env[envVar.name]) {
            log.success(`${envVar.name}: ${process.env[envVar.name]} (${envVar.description})`);
        } else {
            log.warning(`${envVar.name}: Using default "${envVar.default}" (${envVar.description})`);
        }
    }
    
    return allValid;
}

async function testDatabaseConnection(config, name) {
    try {
        const pool = mariadb.createPool({
            ...config,
            connectionLimit: 1,
            acquireTimeout: 5000,
            timeout: 5000
        });
        
        const conn = await pool.getConnection();
        await conn.query('SELECT 1 as test');
        conn.end();
        await pool.end();
        
        log.success(`${name}: Connection successful`);
        return true;
    } catch (error) {
        log.error(`${name}: Connection failed - ${error.message}`);
        return false;
    }
}

async function verifyDatabaseConnections() {
    log.header('\n🔗 TESTING DATABASE CONNECTIONS\n');
    
    const databases = [
        {
            name: 'Main Database (master_specs_db)',
            config: {
                host: process.env.DB_HOST || '127.0.0.1',
                port: process.env.DB_PORT || 3306,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_NAME || 'master_specs_db'
            }
        },
        {
            name: 'Suppliers Database',
            config: {
                host: process.env.SUPPLIERS_DB_HOST || '127.0.0.1',
                port: process.env.SUPPLIERS_DB_PORT || 3306,
                user: process.env.SUPPLIERS_DB_USER,
                password: process.env.SUPPLIERS_DB_PASSWORD,
                database: process.env.SUPPLIERS_DB_NAME || 'suppliers_db'
            }
        },
        {
            name: 'Authentication Database',
            config: {
                host: process.env.AUTH_DB_HOST || '127.0.0.1',
                port: process.env.AUTH_DB_PORT || 3306,
                user: process.env.AUTH_DB_USER,
                password: process.env.AUTH_DB_PASSWORD,
                database: process.env.AUTH_DB_NAME || 'users_db'
            }
        }
    ];
    
    let allConnectionsWork = true;
    
    for (const db of databases) {
        const success = await testDatabaseConnection(db.config, db.name);
        if (!success) {
            allConnectionsWork = false;
        }
    }
    
    return allConnectionsWork;
}

function generateSecurityRecommendations() {
    log.header('\n🔒 SECURITY RECOMMENDATIONS\n');
    
    // Check session secret strength
    const sessionSecret = process.env.SESSION_SECRET;
    if (sessionSecret) {
        if (sessionSecret.length < 32) {
            log.warning('SESSION_SECRET should be at least 32 characters long');
        } else {
            log.success('SESSION_SECRET length is adequate');
        }
        
        if (sessionSecret === 'your_session_secret_here' || sessionSecret === 'your_generated_session_secret' || sessionSecret === 'session-secret-example') {
            log.error('SESSION_SECRET is using a default/example value - change it immediately!');
        }
    }
    
    // Check for session security implementation
    log.info('Checking session security configuration:');
    
    const sessionSecretLength = process.env.SESSION_SECRET ? process.env.SESSION_SECRET.length : 0;
    if (sessionSecretLength >= 64) {
        log.success(`SESSION_SECRET: Cryptographically secure (${sessionSecretLength} characters)`);
    } else if (sessionSecretLength >= 32) {
        log.success(`SESSION_SECRET: Adequate length (${sessionSecretLength} characters)`);
    } else {
        log.warning(`SESSION_SECRET: Length could be improved (${sessionSecretLength} characters)`);
    }
    
    // Check for default/weak session secrets
    if (sessionSecret === 'your_session_secret_here' || sessionSecret === 'your_generated_session_secret' || sessionSecret === 'session-secret-example') {
        log.error('SESSION_SECRET is using a default/example value - change it immediately!');
    } else if (sessionSecret && sessionSecret.length >= 32) {
        log.success('SESSION_SECRET appears to be properly configured');
    }
    
    console.log('');
    
    // General security recommendations
    log.info('Security best practices:');
    console.log('  • Use strong, unique passwords for all database users');
    console.log('  • Generate a cryptographically secure SESSION_SECRET');
    console.log('  • Never commit the .env file to version control');
    console.log('  • Use different database users with minimal required permissions');
    console.log('  • Consider using SSL/TLS for database connections in production');
    console.log('  • Regularly rotate passwords and secrets');
    console.log('  • Monitor session activity for suspicious behavior');
    console.log('  • Implement session timeout and cleanup procedures');
    console.log('  • Use HTTPS in production for secure session cookies');
    console.log('  • Enable session validation and security checks');
}

async function main() {
    console.log(`${colors.bold}${colors.blue}
╔══════════════════════════════════════════════════════════════╗
║                 MYCELIUM ERP - ENV VERIFICATION              ║
║                      Security & Configuration Check         ║
╚══════════════════════════════════════════════════════════════╝
${colors.reset}`);
    
    try {
        const envValid = await verifyEnvironmentVariables();
        const dbValid = await verifyDatabaseConnections();
        
        generateSecurityRecommendations();
        
        log.header('\n📊 SUMMARY\n');
        
        if (envValid && dbValid) {
            log.success('All checks passed! Your application is properly configured.');
        } else {
            if (!envValid) {
                log.error('Some required environment variables are missing.');
            }
            if (!dbValid) {
                log.error('Some database connections failed.');
            }
            log.warning('Please address the issues above before running the application.');
            process.exit(1);
        }
        
    } catch (error) {
        log.error(`Verification failed: ${error.message}`);
        process.exit(1);
    }
}

// Run verification if this script is executed directly
if (require.main === module) {
    main();
}

module.exports = {
    verifyEnvironmentVariables,
    verifyDatabaseConnections,
    generateSecurityRecommendations
};
