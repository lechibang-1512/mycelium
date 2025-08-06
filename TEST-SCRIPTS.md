# Test Scripts Documentation

This document provides comprehensive information about all test scripts in the project. All scripts are designed to run from anywhere within the project directory structure.

## 🔧 Core Features

### ✅ Directory Independence
All test scripts can be run from any subfolder within the project, including:
- Project root (`/`)
- Scripts directory (`/scripts/`)
- Config directory (`/config/`)
- Services directory (`/services/`)
- Any other subdirectory

### ✅ Automatic Project Root Detection
- Scripts automatically find the project root by looking for `package.json`
- Environment variables are loaded from the correct `.env` file
- Relative imports work correctly regardless of execution location

### ✅ Environment Variable Loading
- Scripts automatically locate and load `.env` files
- Multiple search paths ensure compatibility from any directory
- Graceful fallback to system environment variables

## 📋 Available Test Scripts

### 🔍 Environment & Setup

#### `utils-verify-env.js`
**Purpose**: Verify all required environment variables are set  
**Usage**: `node scripts/utils-verify-env.js` or `npm run verify-env`  
**Features**:
- Checks for all required environment variables
- Validates placeholder detection
- Checks for duplicate keys
- Type validation for ports and boolean flags

#### `setup-databases.js`
**Purpose**: Set up all required databases with schemas  
**Usage**: `node scripts/setup-databases.js` or `npm run setup`  
**Features**:
- Creates all required databases
- Loads SQL schemas
- Adds sample data
- Creates admin user

#### `create-admin-user.js`
**Purpose**: Create admin user account  
**Usage**: `node scripts/create-admin-user.js` or `npm run create-admin`  
**Features**:
- Creates admin user with secure password
- Checks for existing admin users
- Validates database connection

### 🧪 Security Tests

#### `test-csrf.js`
**Purpose**: Test CSRF token generation and validation  
**Usage**: `node scripts/test-csrf.js` or `npm run test-csrf`  
**Features**:
- Tests CSRF token endpoint
- Validates token in form submissions
- Tests protection against invalid tokens
- **Requires**: Server running on localhost:3000

#### `test-admin-login.js`
**Purpose**: Test admin user login functionality  
**Usage**: `node scripts/test-admin-login.js` or `npm run test-admin`  
**Features**:
- Tests complete login flow
- Validates CSRF protection
- Checks session creation
- **Requires**: Server running on localhost:3000

#### `test-inactive-login.js`
**Purpose**: Test that inactive users cannot login  
**Usage**: `node scripts/test-inactive-login.js`  
**Features**:
- Tests inactive user account blocking
- Validates error messages
- Ensures security compliance
- **Requires**: Server running on localhost:3000

#### `test-user-creation.js`
**Purpose**: Test complete user creation workflow  
**Usage**: `node scripts/test-user-creation.js` or `npm run test-user-creation`  
**Features**:
- Tests admin login → user management → create user flow
- Validates form submission and CSRF
- Checks user creation in database
- **Requires**: Server running on localhost:3000

### 🏪 Functionality Tests

#### `test-warehouse.js`
**Purpose**: Test warehouse management functionality  
**Usage**: `node scripts/test-warehouse.js` or `npm run test-warehouse`  
**Features**:
- Tests WarehouseService functionality
- Creates sample warehouses and zones
- Validates database operations
- Tests service initialization

### 🔧 Utility Scripts

#### `utils-project-root.js`
**Purpose**: Project root detection utility (core dependency)  
**Usage**: `node scripts/utils-project-root.js`  
**Features**:
- Finds project root directory
- Loads environment variables
- Provides helper functions for other scripts
- Shows project structure analysis

#### `utils-extract-schema.js`
**Purpose**: Extract and analyze database schemas  
**Usage**: `node scripts/utils-extract-schema.js` or `npm run schema-extract`  
**Features**:
- Extracts schemas from live databases
- Analyzes existing schema files
- Interactive schema exploration
- Dependency auto-installation

#### `utils-empty-file-cleanup.js`
**Purpose**: Remove empty files from project directory  
**Usage**: `node scripts/utils-empty-file-cleanup.js` or `npm run cleanup`  
**Features**:
- Recursively scans project directory
- Removes zero-byte files
- Excludes important directories (node_modules, .git)
- Safe cleanup with logging

#### `utils-killserver.js`
**Purpose**: Kill running Node.js server processes  
**Usage**: `node scripts/utils-killserver.js` or `npm run killserver`  
**Features**:
- Finds and kills Node.js processes
- Filter by process name
- Dry run mode available
- Interactive confirmation

### 📊 Test Runners

#### `run-all-tests.js`
**Purpose**: Run all test scripts in sequence  
**Usage**: `node scripts/run-all-tests.js` or `npm test`  
**Options**:
- `--quick` or `-q`: Run only essential tests
- `--no-server` or `-n`: Skip server-dependent tests
- `--verbose` or `-v`: Show detailed output
- `--help` or `-h`: Show help message

**Example Usage**:
```bash
npm test                    # Run all tests
npm run test:quick         # Run essential tests only
npm run test:no-server     # Skip server tests
```

#### `test-directory-independence.js`
**Purpose**: Test that all scripts work from any directory  
**Usage**: `node scripts/test-directory-independence.js` or `npm run test:independence`  
**Features**:
- Tests all scripts from multiple directories
- Validates project root detection
- Checks environment variable loading
- Comprehensive compatibility testing

## 🚀 Quick Start Guide

### 1. Initial Setup
```bash
# Verify environment configuration
npm run verify-env

# Set up databases and create admin user
npm run setup
```

### 2. Run All Tests
```bash
# Start the server first (in another terminal)
npm run dev

# Run all tests
npm test

# Or run quick tests only
npm run test:quick
```

### 3. Run Individual Tests
```bash
# Test admin login
npm run test-admin

# Test CSRF protection
npm run test-csrf

# Test user creation flow
npm run test-user-creation

# Test warehouse functionality
npm run test-warehouse
```

### 4. Test Directory Independence
```bash
# Test that scripts work from any directory
npm run test:independence

# This will test all scripts from:
# - Project root
# - Scripts directory
# - Config directory
# - Services directory
# - And more...
```

## 🛠️ Troubleshooting

### Common Issues

#### "Cannot find module" errors
- **Cause**: Script not using utils-project-root.js
- **Solution**: Ensure script imports and uses the project root utility

#### Environment variable not found
- **Cause**: .env file not detected from current directory
- **Solution**: Scripts should auto-detect .env location

#### Server tests failing
- **Cause**: Server not running on localhost:3000
- **Solution**: Start server with `npm run dev` before running tests

#### Database connection errors
- **Cause**: Database not set up or credentials incorrect
- **Solution**: Run `npm run setup` and verify .env configuration

### Script Requirements

#### Server-Dependent Tests
These tests require the server to be running on localhost:3000:
- `test-csrf.js`
- `test-admin-login.js`
- `test-inactive-login.js`
- `test-user-creation.js`

#### Database-Dependent Tests
These tests require database setup:
- `test-warehouse.js`
- `create-admin-user.js`
- `setup-databases.js`

## 📋 Test Categories

### Essential Tests (Quick Mode)
- Environment verification
- CSRF protection
- Admin login
- User creation flow

### Setup Tests (Full Mode)
- Database setup
- Admin user creation
- Schema extraction

### Utility Tests
- Directory independence
- Empty file cleanup
- Server process management

## 🔄 Continuous Integration

The test scripts are designed to work in CI/CD environments:

```bash
# CI-friendly test command
npm run test:no-server  # Skip server-dependent tests in CI

# Or set up test database and run full suite
npm run setup
npm run dev &          # Start server in background
npm test              # Run all tests
```

## 🔐 Security Considerations

- All scripts validate input and use secure practices
- No sensitive information is logged or exposed
- CSRF protection is tested comprehensively
- User authentication flows are validated
- Database queries use parameterized statements

## 📊 Test Coverage

The test suite covers:
- ✅ Environment configuration
- ✅ Database connectivity and setup
- ✅ User authentication and authorization
- ✅ CSRF protection
- ✅ Session management
- ✅ Warehouse functionality
- ✅ Directory independence
- ✅ Utility functions

## 🎯 Best Practices

1. **Always run from project directory**: While scripts work from anywhere, running from project root is recommended
2. **Set up environment first**: Run `npm run verify-env` before other tests
3. **Use test runners**: Use `npm test` instead of running individual scripts manually
4. **Check server status**: Ensure server is running for server-dependent tests
5. **Review logs**: Check script output for detailed error information

## 📝 Contributing

When adding new test scripts:

1. Use `utils-project-root.js` for project root detection
2. Add proper error handling and logging
3. Include the script in `run-all-tests.js` configuration
4. Add npm script in `package.json`
5. Update this documentation
6. Test from multiple directories to ensure independence
