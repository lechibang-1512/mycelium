# Mycelium Inventory Management System Information

## Summary
Mycelium is a secure, multi-database inventory management system built with Node.js, Express, and MySQL. It features advanced session security, user management, supplier tracking, comprehensive analytics, and QR code integration for modern inventory operations.

## Structure
- **config/**: Database and configuration files
- **middleware/**: Express middleware for authentication, security, rate limiting
- **routes/**: Express routes for different application features
- **services/**: Business logic services for session management, analytics, QR codes
- **views/**: EJS templates for the web interface
- **sql/**: Database schemas for the three separate databases
- **scripts/**: Utility scripts for setup and testing

## Language & Runtime
**Language**: JavaScript (Node.js)
**Version**: Node.js v14+ required
**Build System**: npm
**Package Manager**: npm

## Dependencies
**Main Dependencies**:
- Express (v5.1.0): Web framework
- MariaDB (v3.4.2) & MySQL2 (v3.14.1): Database drivers
- EJS (v3.1.10): Templating engine
- Bcrypt (v6.0.0): Password hashing
- Express-session (v1.18.1): Session management
- Helmet (v8.1.0): Security headers
- QRCode (v1.5.4): QR code generation
- DOMPurify (v3.2.6) & XSS (v1.0.15): Security sanitization

**Development Dependencies**:
- Nodemon (v3.1.10): Development server with auto-reload

## Build & Installation
```bash
# Install dependencies
npm install

# Setup databases
# Create three MySQL databases: master_specs_db, suppliers_db, security_db
# Run the SQL schema files in the sql/ directory

# Configure environment
cp .env.example .env
# Edit .env with your database credentials and session secret

# Verify configuration
npm run verify-env

# Start development server
npm run dev

# Start production server
npm start
```

## Testing
**Framework**: Custom test scripts
**Test Location**: Root directory and scripts/ folder
**Test Files**:
- test-user-creation.js
- test-inactive-login.js
- scripts/test-csrf.js
- scripts/test-admin-login.js
**Run Command**:
```bash
# Security tests
npm run test:security

# Session secret tests
npm run test-session-secrets
```

## Database Architecture
**Multi-Database Design**:
- **master_specs_db**: Main inventory database (products, inventory logs, receipts)
- **suppliers_db**: Supplier information and management
- **security_db**: User authentication, sessions, and security events

## Security Features
- Environment-based configuration via .env files
- Advanced session security with dynamic session secrets
- CSRF protection with @dr.pogodin/csurf
- Input sanitization and validation middleware
- Rate limiting for API and authentication endpoints
- Security event logging and monitoring
- Token invalidation for session management

## Application Components
- **Authentication System**: User login, registration, session management
- **Inventory Management**: Product tracking, stock levels, inventory logs
- **Supplier Management**: Supplier information and relationship tracking
- **Receipt Management**: Purchase and sales receipt tracking
- **QR Code System**: Generation and scanning for products and transactions
- **Analytics**: Sales trends, inventory metrics, supplier performance
- **User Management**: Role-based access control (admin, staff)

## Entry Points
- **server.js**: Main application entry point
- **routes/**: Modular route handlers for different features
- **views/**: EJS templates for web interface pages