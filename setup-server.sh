#!/bin/bash

echo "🚀 Setting up Mycelium ERP Server..."
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_error ".env file not found!"
    echo "Please copy .env.example to .env and configure your database settings"
    exit 1
fi

print_status "Found .env file"

# Check if Node.js dependencies are installed
if [ ! -d "node_modules" ]; then
    print_warning "Node modules not found. Installing dependencies..."
    npm install
    if [ $? -eq 0 ]; then
        print_status "Dependencies installed successfully"
    else
        print_error "Failed to install dependencies"
        exit 1
    fi
else
    print_status "Node modules found"
fi

# Test database connection
print_status "Testing database connection..."
node -e "
const mariadb = require('mariadb');
require('dotenv').config();

async function testConnection() {
    const config = {
        host: process.env.DB_HOST || '127.0.0.1',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER,
        // Do NOT log or expose the password in any logs
        password: process.env.DB_PASSWORD,
        connectionLimit: 1
    };
    
    try {
        const pool = mariadb.createPool(config);
        const conn = await pool.getConnection();
        console.log('✅ Database connection successful');
        await conn.release();
        await pool.end();
        process.exit(0);
    } catch (error) {
        console.log('❌ Database connection failed:', error.message);
        console.log('');
        console.log('Common solutions:');
        console.log('1. Make sure MariaDB/MySQL is running: sudo systemctl start mariadb');
        console.log('2. Check your database credentials in .env file');
        console.log('3. Create the database user if it doesn\\'t exist:');
        console.log('   sudo mysql -u root -p');
        console.log('   CREATE USER \\'lechibang\\'@\\'localhost\\' IDENTIFIED BY \\'1212\\';');
        console.log('   GRANT ALL PRIVILEGES ON *.* TO \\'lechibang\\'@\\'localhost\\';');
        console.log('   FLUSH PRIVILEGES;');
        console.log('   EXIT;');
        process.exit(1);
    }
}

testConnection();
"

if [ $? -ne 0 ]; then
    exit 1
fi

# Set up databases
print_status "Setting up databases..."
node scripts/setup-databases.js

if [ $? -eq 0 ]; then
    print_status "Database setup completed"
else
    print_error "Database setup failed"
    exit 1
fi

# Create admin user
print_status "Setting up admin user..."
node scripts/create-admin-user.js

if [ $? -eq 0 ]; then
    print_status "Admin user setup completed"
else
    print_warning "Admin user setup had issues, but continuing..."
fi

# Final success message
echo ""
echo "🎉 Server setup completed successfully!"
echo "======================================"
echo ""
echo "To start the server:"
echo "  npm run dev"
echo ""
echo "Default admin login:"
echo "  Username: admin"
echo "  Password: admin123"
echo ""
echo "The server will be available at: http://localhost:3000"
echo ""
echo "To test admin login after starting server:"
echo "  node scripts/test-admin-login.js"
