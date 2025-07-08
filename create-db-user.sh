#!/bin/bash

echo "🔧 Creating Database User for Mycelium ERP"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

echo "This script will create the database user 'lechibang' with password '1212'"
echo "You will need to enter your MySQL/MariaDB root password"
echo ""

# Create the database user
sudo mysql << EOF
CREATE USER IF NOT EXISTS 'lechibang'@'localhost' IDENTIFIED BY '1212';
GRANT ALL PRIVILEGES ON *.* TO 'lechibang'@'localhost';
FLUSH PRIVILEGES;
SELECT User, Host FROM mysql.user WHERE User = 'lechibang';
EOF

if [ $? -eq 0 ]; then
    print_status "Database user 'lechibang' created successfully"
    echo ""
    echo "You can now run the setup script:"
    echo "  ./setup-server.sh"
else
    print_error "Failed to create database user"
    echo ""
    echo "Manual setup instructions:"
    echo "1. Connect to MySQL/MariaDB as root:"
    echo "   sudo mysql -u lechibang -p"
    echo ""
    echo "2. Run these commands:"
    echo "   CREATE USER IF NOT EXISTS 'lechibang'@'localhost' IDENTIFIED BY '1212';"
    echo "   GRANT ALL PRIVILEGES ON *.* TO 'lechibang'@'localhost';"
    echo "   FLUSH PRIVILEGES;"
    echo "   EXIT;"
fi
