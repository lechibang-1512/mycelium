# Mycelium Inventory Management System

A secure, multi-database inventory management system built with Node.js, Express, and MySQL. Features advanced session security, user management, supplier tracking, comprehensive analytics, and QR code integration for modern inventory operations.

## 🚀 Features

### Core Functionality
- **Inventory Management**: Track stock levels, products, and movements with real-time updates
- **Supplier Management**: Maintain supplier information and relationships with performance tracking
- **User Management**: Role-based access control with secure authentication
- **Analytics & Reports**: Comprehensive business intelligence and reporting with visual insights
- **Session Security**: Advanced session management with token-based authentication
- **Receipt Management**: Complete receipt tracking for purchases and sales with detailed analytics

### QR Code Integration
- **QR Code Generation**: Generate QR codes for products, locations, batches, and transactions
- **QR Code Scanning**: Camera-based scanning with automatic processing and routing
- **Product QR Codes**: Link products to their detailed information and inventory status
- **Location QR Codes**: Track storage locations and bin management
- **Batch QR Codes**: Track inventory batches and lot numbers
- **Transaction QR Codes**: Link to specific inventory movements and receipts
- **Bulk QR Generation**: Generate multiple QR codes at once for efficient operations
- **Print & Export**: Print QR code labels and export for physical attachment

### Advanced Analytics
- **Real-time Dashboard**: Live inventory metrics and performance indicators
- **Stock Alerts**: Intelligent low stock and critical stock monitoring
- **Sales Analytics**: Revenue trends, top-selling products, and performance insights
- **Receipt Analytics**: Comprehensive receipt analysis with visual charts
- **Supplier Performance**: Track supplier reliability and cost analysis
- **Inventory Optimization**: Smart recommendations for restocking and product placement
- **Market Trends**: Brand performance and pricing analytics

### Security Features
- **Environment-based Configuration**: All credentials managed via `.env` files
- **Advanced Session Security**: Unique session tokens, IP validation, and session tracking
- **CSRF Protection**: Built-in protection against cross-site request forgery
- **Input Sanitization**: Comprehensive data validation and sanitization
- **Session Management Dashboard**: Real-time session monitoring and management
- **Rate Limiting**: API and authentication rate limiting for security
- **Audit Logging**: Complete audit trail of all system activities

### Technical Features
- **Multi-Database Architecture**: Separate databases for inventory, suppliers, and user management
- **RESTful API**: Clean API design for all operations with comprehensive endpoints
- **Responsive UI**: Modern, mobile-friendly interface optimized for all devices
- **Real-time Notifications**: Push notifications for important events and alerts
- **Advanced Search**: Powerful search and filtering capabilities across all modules
- **Export Capabilities**: Export data to various formats (PDF, CSV, Excel)
- **Modular Architecture**: Clean, maintainable codebase structure
- **Progressive Web App**: Optimized for mobile and offline capabilities

## 📋 Prerequisites

- **Node.js** (v14 or higher)
- **npm** (v6 or higher)
- **MySQL/MariaDB** (v8.0 or higher)
- **Git**

## 🛠️ Installation

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/inventory-management-system.git
cd inventory-management-system
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Database Setup

Create three MySQL databases:
```sql
CREATE DATABASE master_specs_db;
CREATE DATABASE suppliers_db;
CREATE DATABASE users_db;
```

Create a dedicated database user with appropriate permissions:
```sql
CREATE USER 'your_db_user'@'localhost' IDENTIFIED BY 'your_database_password';
GRANT ALL PRIVILEGES ON master_specs_db.* TO 'your_db_user'@'localhost';
GRANT ALL PRIVILEGES ON suppliers_db.* TO 'your_db_user'@'localhost';
GRANT ALL PRIVILEGES ON users_db.* TO 'your_db_user'@'localhost';
FLUSH PRIVILEGES;
```

### 4. Environment Configuration

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Main Database Configuration
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_database_password
DB_NAME=master_specs_db

# Suppliers Database Configuration
SUPPLIERS_DB_HOST=127.0.0.1
SUPPLIERS_DB_PORT=3306
SUPPLIERS_DB_USER=your_db_user
SUPPLIERS_DB_PASSWORD=your_database_password
SUPPLIERS_DB_NAME=suppliers_db

# Authentication Database Configuration
AUTH_DB_HOST=127.0.0.1
AUTH_DB_PORT=3306
AUTH_DB_USER=your_db_user
AUTH_DB_PASSWORD=your_database_password
AUTH_DB_NAME=users_db

# Session Configuration
SESSION_SECRET=your_generated_session_secret

# Server Configuration
PORT=3000
NODE_ENV=production
```

### 5. Generate Secure Session Secret

Generate a cryptographically secure session secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the output and update `SESSION_SECRET` in your `.env` file.

### 6. Verify Configuration

Run the configuration verification script:
```bash
npm run verify-env
```

This will check:
- All required environment variables are set
- Database connections are working
- Session security is properly configured

## 🚦 Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The application will be available at `http://localhost:3000`

## 📚 Usage

### First-Time Setup

1. **Access the Application**: Navigate to `http://localhost:3000`
2. **Create Admin User**: Register the first user (automatically gets admin privileges)
3. **Configure System**: Use the admin panel to configure system settings
4. **Add Users**: Create additional users with appropriate roles

### User Roles

- **Admin**: Full system access, user management, system configuration
- **Manager**: Inventory management, reports, supplier management
- **User**: Limited inventory access, basic operations

### Key Operations

#### Inventory Management
- Add/edit products and stock levels
- Track stock movements and transactions
- Set up automated stock alerts with critical and low stock thresholds
- QR code generation and scanning for efficient inventory tracking
- Generate comprehensive inventory reports
- Stock optimization recommendations and automated insights

#### Receipt Management
- Generate and track purchase and sales receipts
- Comprehensive receipt analytics with visual charts
- Bulk receipt operations (export, print, delete)
- Advanced filtering and search capabilities
- Real-time receipt value tracking
- Receipt type distribution analysis

#### QR Code Operations
- **Scanning**: Camera-based QR code scanning with automatic routing
- **Generation**: Create QR codes for products, locations, and transactions
- **Batch Operations**: Generate multiple QR codes simultaneously
- **Print Support**: Print individual or batch QR code labels
- **Data Processing**: Automatic QR code data parsing and action routing

#### Supplier Management
- Maintain comprehensive supplier database
- Track supplier performance and reliability metrics
- Manage supplier contacts and terms
- Supplier cost analysis and comparison
- Purchase order tracking and management

#### User Management (Admin Only)
- Create and manage user accounts with role-based permissions
- Assign roles (Admin, Manager, User) with appropriate access levels
- Monitor user activity and session tracking
- Advanced session security management
- User audit trails and activity logs

#### Session Management (Admin Only)
- View active sessions across the system with real-time monitoring
- Monitor session security metrics and unusual activity
- Force logout suspicious sessions with security alerts
- Review comprehensive session audit logs
- Dynamic session secret management for enhanced security

#### Analytics & Reporting
- **Dashboard Analytics**: Real-time metrics and performance indicators
- **Sales Trends**: Revenue analysis with visual charts and growth tracking
- **Inventory Analytics**: Stock distribution, turnover rates, and optimization
- **Market Analysis**: Brand performance and pricing trends
- **Performance Insights**: Best-selling products and supplier performance
- **Custom Reports**: Export analytics in multiple formats (PDF, CSV, Excel)

## 🔒 Security

### Session Security Features

- **Unique Session Tokens**: Each session gets a cryptographically secure token
- **Session Validation**: Multi-factor session validation including IP and user agent
- **Session Tracking**: Comprehensive audit trail of all session activity
- **Automatic Cleanup**: Expired sessions are automatically removed
- **Admin Dashboard**: Real-time session monitoring and management

### Best Practices

- **Regular Updates**: Keep dependencies updated with security patches
- **Strong Passwords**: Enforce strong password policies for all users
- **Environment Variables**: Never commit sensitive data to version control
- **Regular Backups**: Implement regular database backups and recovery procedures
- **Session Monitoring**: Regularly review session activity logs and security metrics
- **QR Code Security**: Validate scanned QR codes and protect generated codes
- **Audit Trails**: Monitor all system activities and maintain comprehensive logs

## 📁 Project Structure

```
├── config/                 # Database and configuration files
│   ├── database.js         # Main database configuration
│   ├── auth-database.js    # Authentication database configuration
│   └── analytics.js        # Analytics configuration
├── middleware/             # Express middleware
│   ├── auth.js            # Authentication and session middleware
│   ├── security.js        # Security headers and protection
│   ├── rateLimiting.js    # Rate limiting configuration
│   └── inputValidation.js # Input validation middleware
├── routes/                 # Express routes
│   ├── auth.js            # Authentication routes
│   ├── analytics.js       # Analytics routes
│   ├── inventory.js       # Inventory management routes
│   ├── receipts.js        # Receipt management routes
│   ├── qrcode.js          # QR code generation and scanning routes
│   └── suppliers.js       # Supplier management routes
├── services/              # Business logic services
│   ├── SessionManagementService.js  # Session management
│   ├── AnalyticsService.js          # Analytics processing
│   ├── QRCodeService.js             # QR code generation and processing
│   ├── ReceiptService.js            # Receipt processing
│   ├── notifications.js             # Notification service
│   ├── SanitizationService.js       # Data sanitization
│   └── PasswordValidator.js         # Password validation
├── views/                 # EJS templates
│   ├── partials/          # Reusable template parts
│   ├── qrcode-scanner.ejs # QR code scanning interface
│   ├── qrcode-generator.ejs # QR code generation interface
│   ├── receipts-analytics.ejs # Receipt analytics dashboard
│   ├── stock-alerts.ejs   # Stock alert management
│   └── *.ejs             # Page templates
├── public/                # Static assets
│   ├── css/              # Stylesheets
│   ├── js/               # Client-side JavaScript
│   │   ├── qrscanner.js  # QR code scanning functionality
│   │   └── notifications.js # Client-side notifications
│   └── qrcodes/          # Generated QR code storage
├── scripts/              # Utility scripts
│   ├── verify-env-config.js        # Environment verification
│   ├── test-admin-login.js         # Admin login testing
│   ├── test-csrf.js                # CSRF protection testing
│   └── utils-extract-schema.js     # Database schema utilities
├── sql/                  # Database schemas
│   ├── master_specs_db-schema.sql  # Main inventory database
│   ├── suppliers_db-schema.sql     # Suppliers database
│   └── users_db-schema.sql         # Users and authentication database
└── server.js             # Main application entry point
```

## 🔧 Scripts

- `npm start` - Start the production server
- `npm run dev` - Start the development server with auto-reload
- `npm run verify-env` - Verify environment configuration
- `npm run check-config` - Alias for verify-env
- `npm run test:security` - Run security tests
- `npm run test-session-secrets` - Test dynamic session secrets

## 🔍 Troubleshooting

### Common Issues

#### Database Connection Errors
- Verify database credentials in `.env`
- Ensure MySQL/MariaDB is running
- Check database user permissions
- Run `npm run verify-env` to test connections

#### Session Issues
- Verify `SESSION_SECRET` is set and secure
- Check for session conflicts (multiple instances)
- Review session management logs

#### Authentication Problems
- Ensure authentication database is properly configured
- Check user roles and permissions
- Verify session middleware is working

#### Performance Issues
- Monitor database performance
- Review session cleanup schedules
- Check for memory leaks in long-running sessions
- Monitor QR code generation and storage efficiency

## 📝 API Documentation

The system provides RESTful APIs for all major operations. API documentation is available at `/api/docs` when running in development mode.

### Authentication
All API endpoints require proper authentication via session tokens.

### Rate Limiting
API endpoints are rate-limited to prevent abuse.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes with appropriate tests
4. Ensure all security checks pass
5. Submit a pull request

### Development Guidelines

- Follow the existing code style
- Add tests for new features
- Update documentation for any changes
- Ensure security best practices are followed
- Never commit sensitive information

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For support and questions:
- Review the troubleshooting section above
- Check the issue tracker on GitHub
- Review the session security documentation in `SESSION_SECURITY.md`

## 🚨 Security Notice

This system handles sensitive business data. Always:
- Use strong, unique passwords for all accounts
- Keep the system updated with security patches
- Regularly monitor session activity
- Follow proper backup and recovery procedures
- Never expose sensitive configuration in public repositories

---

**Version**: 3.0.0  
**Last Updated**: July 2025
