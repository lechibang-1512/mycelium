#!/bin/bash

# Setup colors for TUI
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

function show_banner() {
    clear
    echo -e "${CYAN}======================================================${NC}"
    echo -e "${CYAN}        Mycelium App Setup & Deployment Tool          ${NC}"
    echo -e "${CYAN}======================================================${NC}"
    echo ""
}

function check_root() {
    if [ "$EUID" -ne 0 ]; then
        echo -e "${RED}WARNING: You are not running as root.${NC}"
        echo -e "${RED}Some steps like installing system dependencies or starting systemd services may fail.${NC}"
        echo ""
        sleep 2
    fi
}

function prompt_credentials() {
    echo -e "${YELLOW}>> Please provide credentials for the setup:${NC}"
    
    DB_USER=""
    while [[ -z "$DB_USER" ]]; do
        read -p "Database Username: " DB_USER
    done

    DB_PASS=""
    while [[ -z "$DB_PASS" ]]; do
        read -s -p "Database Password: " DB_PASS
        echo ""
    done
    
    ADM_USER=""
    while [[ -z "$ADM_USER" ]]; do
        read -p "App Admin Username: " ADM_USER
    done

    ADM_PASS=""
    while [[ -z "$ADM_PASS" ]]; do
        read -s -p "App Admin Password: " ADM_PASS
        echo ""
    done
}

function install_dependencies() {
    echo -e "${YELLOW}>> Step 1: Checking system dependencies...${NC}"
    if ! command -v mariadb >/dev/null 2>&1 || ! rpm -qa | grep -q mariadb-server; then
        echo -e "Installing mariadb-server..."
        if command -v dnf >/dev/null 2>&1; then
            dnf install -y mariadb-server
        elif command -v apt-get >/dev/null 2>&1; then
            apt-get install -y mariadb-server
        else
            echo -e "${RED}Unsupported package manager. Please install MariaDB manually.${NC}"
        fi
    else
        echo -e "${GREEN}MariaDB server is already installed.${NC}"
    fi

    echo -e "Ensuring MariaDB service is running..."
    systemctl enable --now mariadb || echo -e "${RED}Failed to start MariaDB service. Continuing...${NC}"
    
    echo -e "${YELLOW}>> Running npm install...${NC}"
    npm install
    echo -e "${GREEN}Dependencies installed!${NC}"
}

function setup_database() {
    echo -e "${YELLOW}>> Step 2: Database Setup${NC}"

    echo -e "Creating databases and user '${DB_USER}'..."
    mariadb -u root <<-EOSQL
        CREATE DATABASE IF NOT EXISTS master_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
        CREATE DATABASE IF NOT EXISTS security_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
        CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
        CREATE USER IF NOT EXISTS '${DB_USER}'@'%' IDENTIFIED BY '${DB_PASS}';
        GRANT ALL PRIVILEGES ON *.* TO '${DB_USER}'@'localhost' WITH GRANT OPTION;
        GRANT ALL PRIVILEGES ON *.* TO '${DB_USER}'@'%' WITH GRANT OPTION;
        FLUSH PRIVILEGES;
EOSQL

    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to execute database creation. Ensure MariaDB is running and you have root access.${NC}"
    else
        echo -e "Importing SQL schema dumps..."
        mariadb -u root master_db < sql/master_db.sql || echo -e "${RED}Failed to import master_db.sql${NC}"
        mariadb -u root security_db < sql/security_db.sql || echo -e "${RED}Failed to import security_db.sql${NC}"
        echo -e "${GREEN}Database setup complete!${NC}"
    fi
}

function create_admin() {
    echo -e "${YELLOW}>> Step 3: Create Application Admin User & Configure Permissions${NC}"
    echo "Running database seeder to append user '${ADM_USER}' and all permissions..."
    
    # Pass the DB credentials inline so the seeder works even if .env isn't generated yet
    if DB_USER="${DB_USER}" DB_PASSWORD="${DB_PASS}" DB_HOST="localhost" DB_PORT="3306" DB_NAME="master_db" AUTH_DB_HOST="localhost" AUTH_DB_PORT="3306" AUTH_DB_USER="${DB_USER}" AUTH_DB_PASSWORD="${DB_PASS}" AUTH_DB_NAME="security_db" SEED_ADMIN_USER="${ADM_USER}" SEED_ADMIN_PASS="${ADM_PASS}" node scripts/tools/seed-db.js; then
        echo -e "${GREEN}Database seeding complete! User '${ADM_USER}' appended and granted all permissions.${NC}"
    else
        echo -e "${RED}Failed to run seeder.${NC}"
    fi
}

function deploy_app() {
    echo -e "${YELLOW}>> Step 4: Deploying Application${NC}"
    echo -e "Building frontend bundle and setting up assets..."
    
    if npm run build:full; then
        echo -e "${GREEN}Build completed successfully.${NC}"
    else
        echo -e "${RED}Build failed! Please check the logs.${NC}"
    fi
}

function configure_env() {
    echo -e "${YELLOW}>> Step 5: Generating .env Configuration (Final Step)${NC}"

    echo "Generating .env file..."
    cat > .env <<EOF
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASS}
DB_NAME=master_db
DB_SSL=false

# Authentication Database Configuration
AUTH_DB_HOST=localhost
AUTH_DB_PORT=3306
AUTH_DB_USER=${DB_USER}
AUTH_DB_PASSWORD=${DB_PASS}
AUTH_DB_NAME=security_db
AUTH_DB_SSL=false

# Server Configuration
PORT=3000
NODE_ENV=production
CLIENT_URL=http://localhost:3000

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM="Inventory Management <noreply@inventory.com>"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
LOG_TO_FILE=false
LOG_FILE_PATH=./logs/app.log
EOF
    echo -e "${GREEN}.env file created successfully!${NC}"
}

function main_menu() {
    while true; do
        show_banner
        check_root
        echo "Please select an option:"
        echo -e "  ${YELLOW}1)${NC} Full Automated Setup (Recommended)"
        echo -e "  ${CYAN}2)${NC} Custom Setup: Install Dependencies Only"
        echo -e "  ${CYAN}3)${NC} Custom Setup: Configure Database Only"
        echo -e "  ${CYAN}4)${NC} Custom Setup: Create Admin User Only"
        echo -e "  ${CYAN}5)${NC} Custom Setup: Deploy App Only"
        echo -e "  ${CYAN}6)${NC} Custom Setup: Generate .env Only"
        echo -e "  ${RED}7)${NC} Exit"
        echo ""
        read -p "Select [1-7]: " CHOICE
        
        case $CHOICE in
            1) 
               prompt_credentials
               install_dependencies
               setup_database
               create_admin
               deploy_app
               configure_env
               echo -e "${GREEN}Setup completely finished!${NC}"
               echo -e "${CYAN}You can now start the Node.js server with: npm start${NC}"
               read -p "Do you want to start the Node.js server now? (y/N): " START_APP
               if [[ "$START_APP" =~ ^[Yy]$ ]]; then
                   echo -e "${GREEN}Starting app... Press Ctrl+C to stop.${NC}"
                   npm start
               fi
               read -p "Press Enter to return to menu..."
               ;;
            2) install_dependencies; read -p "Press Enter..." ;;
            3) prompt_credentials; setup_database; read -p "Press Enter..." ;;
            4) prompt_credentials; create_admin; read -p "Press Enter..." ;;
            5) deploy_app; read -p "Press Enter..." ;;
            6) prompt_credentials; configure_env; read -p "Press Enter..." ;;
            7) 
               echo -e "${GREEN}Goodbye!${NC}"
               exit 0 
               ;;
            *) 
               echo -e "${RED}Invalid option.${NC}"
               sleep 1
               ;;
        esac
    done
}

main_menu
