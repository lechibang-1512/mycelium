# 🚀 Mycelium ERP Server Setup Guide

This guide will help you set up the Mycelium ERP server from scratch, every time you need to configure it.

## 📋 Prerequisites

- **Node.js** (v14 or higher)
- **MariaDB/MySQL** server running
- **Git** (for cloning the repository)

## 🔧 Quick Setup (Automated)

### Option 1: Full Automated Setup

If this is your first time setting up or you need to create the database user:

```bash
# 1. Create the database user (you'll need root password)
./create-db-user.sh

# 2. Set up everything else
./setup-server.sh

# 3. Start the server
npm run dev
```

### Option 2: If Database User Already Exists

If you've already created the database user before:

```bash
# Just run the setup script
./setup-server.sh

# Start the server
npm run dev
```

## 🛠️ Manual Setup (If Scripts Fail)

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Configure Environment

The `.env` file should already be configured with these settings:

```bash
# Database Configuration
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=lechibang
DB_PASSWORD=1212
DB_NAME=master_specs_db

# Suppliers Database
SUPPLIERS_DB_HOST=127.0.0.1
SUPPLIERS_DB_PORT=3306
SUPPLIERS_DB_USER=lechibang
SUPPLIERS_DB_PASSWORD=1212
SUPPLIERS_DB_NAME=suppliers_db

# Authentication Database
AUTH_DB_HOST=127.0.0.1
AUTH_DB_PORT=3306
AUTH_DB_USER=lechibang
AUTH_DB_PASSWORD=1212
AUTH_DB_NAME=security_db

# Session Secret (already generated)
SESSION_SECRET=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
```

### Step 3: Create Database User

Connect to MySQL/MariaDB as root and run:

```sql
-- Connect using: sudo mysql
CREATE USER IF NOT EXISTS 'lechibang'@'localhost' IDENTIFIED BY '1212';
GRANT ALL PRIVILEGES ON *.* TO 'lechibang'@'localhost';
FLUSH PRIVILEGES;
```

### Step 4: Set Up Databases

```bash
node scripts/setup-databases.js
```

### Step 5: Start the Server

```bash
npm run dev
```

## 🔐 Default Login Credentials

After setup, you can log in with:

- **Username:** `admin`
- **Password:** `admin123`

## 🌐 Accessing the Application

Once the server is running:

- **Application URL:** http://localhost:3000
- **Login Page:** http://localhost:3000/login

## 🚨 Troubleshooting

### Database Connection Issues

**Error:** `Access denied for user 'lechibang'@'localhost'`

**Solution:**
1. Make sure MariaDB/MySQL is running:
   ```bash
   sudo systemctl start mariadb
   sudo systemctl status mariadb
   ```

2. Create the database user:
   ```bash
   ./create-db-user.sh
   ```

**Error:** `pool timeout: failed to retrieve a connection`

**Solutions:**
1. Check if MariaDB/MySQL is running
2. Verify credentials in `.env` file
3. Test connection manually:
   ```bash
   mysql -u lechibang -p1212 -h 127.0.0.1
   ```

### Port Already in Use

**Error:** `EADDRINUSE: address already in use :::3000`

**Solution:**
1. Kill the process using port 3000:
   ```bash
   sudo lsof -ti:3000 | xargs kill -9
   ```

2. Or use a different port by changing `PORT` in `.env`

### Missing Dependencies

**Error:** `Cannot find module '...'`

**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
```

## 📁 Project Structure

```
├── config/           # Database configurations
├── middleware/       # Express middleware
├── routes/          # Application routes
├── services/        # Business logic services
├── views/           # EJS templates
├── scripts/         # Setup and utility scripts
├── sql/             # Database schemas
├── .env             # Environment configuration
├── server.js        # Main server file
├── setup-server.sh  # Automated setup script
└── create-db-user.sh # Database user creation script
```

## 🔄 Resetting Everything

If you need to completely reset and start over:

```bash
# 1. Stop the server (Ctrl+C)

# 2. Drop databases (connect as root)
mysql -u root -p
DROP DATABASE IF EXISTS master_specs_db;
DROP DATABASE IF EXISTS suppliers_db;
DROP DATABASE IF EXISTS security_db;
EXIT;

# 3. Re-run setup
./setup-server.sh
```

## 📝 Notes

- The server uses three separate databases for better organization
- Session secrets are automatically generated for security
- All passwords are hashed using bcrypt
- CSRF protection is enabled by default
- Rate limiting is implemented for security
