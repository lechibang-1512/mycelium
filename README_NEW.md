# Mycelium Inventory Management System

A secure, multi-database inventory management system built with Node.js, Express, and MySQL. Features advanced session security, user management, supplier tracking, and comprehensive analytics.

## 🚀 Features

### Core Functionality
- **Inventory Management**: Track stock levels, products, and movements
- **Supplier Management**: Maintain supplier information and relationships
- **User Management**: Role-based access control with secure authentication
- **Analytics & Reports**: Comprehensive business intelligence and reporting
- **Session Security**: Advanced session management with token-based authentication

### Security Features
- **Environment-based Configuration**: All credentials managed via `.env` files
- **Advanced Session Security**: Unique session tokens, IP validation, and session tracking
- **CSRF Protection**: Built-in protection against cross-site request forgery
- **Input Sanitization**: Comprehensive data validation and sanitization
- **Session Management Dashboard**: Real-time session monitoring and management

### Technical Features
- **Multi-Database Architecture**: Separate databases for inventory, suppliers, and user management
- **RESTful API**: Clean API design for all operations
- **Responsive UI**: Modern, mobile-friendly interface
- **Real-time Notifications**: Push notifications for important events
- **Modular Architecture**: Clean, maintainable codebase structure

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
- Set up automated stock alerts
- Generate inventory reports

#### Supplier Management
- Maintain supplier database
- Track supplier performance
- Manage supplier contacts and terms

#### User Management (Admin Only)
- Create and manage user accounts
- Assign roles and permissions
- Monitor user activity
- Manage session security

#### Session Management (Admin Only)
- View active sessions across the system
- Monitor session security metrics
- Force logout suspicious sessions
- Review session audit logs

## 🔒 Security

### Session Security Features

- **Unique Session Tokens**: Each session gets a cryptographically secure token
- **Session Validation**: Multi-factor session validation including IP and user agent
- **Session Tracking**: Comprehensive audit trail of all session activity
- **Automatic Cleanup**: Expired sessions are automatically removed
- **Admin Dashboard**: Real-time session monitoring and management

### Best Practices

- **Regular Updates**: Keep dependencies updated
- **Strong Passwords**: Enforce strong password policies
- **Environment Variables**: Never commit sensitive data to version control
- **Regular Backups**: Implement regular database backups
- **Session Monitoring**: Regularly review session activity logs

## 📁 Project Structure

```
├── config/                 # Database and configuration files
│   ├── database.js         # Main database configuration
│   ├── auth-database.js    # Authentication database configuration
│   └── analytics.js        # Analytics configuration
├── middleware/             # Express middleware
│   └── auth.js            # Authentication and session middleware
├── routes/                 # Express routes
│   ├── auth.js            # Authentication routes
│   └── analytics.js       # Analytics routes
├── services/              # Business logic services
│   ├── SessionManagementService.js  # Session management
│   ├── AnalyticsService.js          # Analytics processing
│   ├── notifications.js             # Notification service
│   ├── ReceiptService.js           # Receipt processing
│   └── SanitizationService.js      # Data sanitization
├── views/                 # EJS templates
│   ├── partials/          # Reusable template parts
│   └── *.ejs             # Page templates
├── public/                # Static assets
│   ├── css/              # Stylesheets
│   └── js/               # Client-side JavaScript
├── scripts/              # Utility scripts
│   ├── verify-env-config.js        # Environment verification
│   └── utils-extract-schema.js     # Database schema utilities
└── server.js             # Main application entry point
```

## 🔧 Scripts

- `npm start` - Start the production server
- `npm run dev` - Start the development server with auto-reload
- `npm run verify-env` - Verify environment configuration
- `npm run check-config` - Alias for verify-env

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

**Version**: 2.0.0  
**Last Updated**: December 2024
