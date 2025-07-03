# Security Policy

## Reporting Security Vulnerabilities

If you discover a security vulnerability in the Mycelium ERP system, please report it responsibly:

1. **Check Known Issues**: Review existing issues and the CWE (Common Weakness Enumeration) database
2. **Create an Issue**: If the vulnerability is confirmed to be valid and warrants investigation, please create an issue on our repository
3. **Provide Details**: Include steps to reproduce, potential impact, and suggested fixes if available

## Security Features

This application implements comprehensive security measures:

### Authentication & Session Security
- **Advanced Session Management**: Unique tokens, validation, and real-time tracking
- **Session Timeout**: Automatic idle timeout (30 minutes) and maximum duration limits
- **Dynamic Session Secrets**: Automatic rotation with fallback support
- **Session Hijacking Protection**: User agent validation and IP monitoring
- **Secure Session Storage**: HTTPOnly, Secure, and SameSite cookie attributes

### Password Security
- **Strong Password Policies**: Enforced complexity requirements
- **Password Strength Validation**: Real-time strength checking with user feedback
- **Password History**: Prevention of password reuse
- **Secure Hashing**: bcrypt with 12 rounds for enhanced security
- **Common Password Detection**: Protection against frequently used passwords

### Input Protection
- **Comprehensive Input Validation**: Server-side validation for all user inputs
- **XSS Protection**: HTML sanitization and Content Security Policy (CSP)
- **SQL Injection Prevention**: Parameterized queries and input escaping
- **CSRF Protection**: Built-in protection against cross-site request forgery attacks
- **File Upload Security**: Type validation and size limits

### Rate Limiting & Brute Force Protection
- **Authentication Rate Limiting**: 5 attempts per 15 minutes for login endpoints
- **General Rate Limiting**: 1000 requests per 15 minutes per IP
- **API Write Protection**: 30 write operations per minute
- **Password Reset Limiting**: 3 attempts per hour
- **Admin Panel Protection**: Enhanced rate limiting for administrative functions

### Security Headers
- **Content Security Policy (CSP)**: Prevents XSS and code injection
- **Strict Transport Security (HSTS)**: Forces HTTPS in production
- **X-Frame-Options**: Prevents clickjacking attacks
- **X-Content-Type-Options**: Prevents MIME type sniffing
- **Permissions Policy**: Restricts browser APIs access

### Data Protection
- **Environment-based Configuration**: All sensitive credentials in environment variables
- **Secret Sanitization**: Automatic sanitization of sensitive data in logs and responses
- **Database Security**: Separate users with minimal required permissions
- **Input Sanitization**: Comprehensive data validation and sanitization

### Monitoring & Auditing
- **Session Monitoring**: Real-time session tracking and security violation detection
- **Security Logging**: Comprehensive logging of security events
- **Failed Login Tracking**: Monitoring and alerting for suspicious activities
- **Automatic Cleanup**: Regular cleanup of expired sessions and data

## Security Best Practices

### For Administrators
- Use strong, unique passwords for all database accounts
- Generate cryptographically secure session secrets (minimum 64 characters)
- Never commit `.env` files to version control
- Use HTTPS in production environments
- Regularly update dependencies and apply security patches
- Monitor session activity for suspicious behavior
- Implement proper database user permissions
- Review security logs regularly
- Enable automatic session secret rotation

### For Users
- Use strong passwords with mixed case, numbers, and special characters
- Avoid common passwords and patterns
- Log out when finished, especially on shared devices
- Report suspicious activity immediately
- Keep your browser updated
- Don't share login credentials

### For Developers
- Follow secure coding practices
- Validate all inputs on both client and server side
- Use parameterized queries for database operations
- Implement proper error handling without information disclosure
- Regular security testing and code reviews
- Keep security dependencies updated

## Implementation Details

### Session Security
- Session tokens: 32-byte cryptographically secure random tokens
- Session IDs: 16-byte cryptographically secure identifiers
- Automatic session cleanup every 15 minutes
- Session validation on every request

### Password Requirements
- Minimum 8 characters (recommended 12+)
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character
- Protection against common passwords and patterns

### Rate Limiting Configuration
- General: 1000 requests per 15 minutes
- Authentication: 5 attempts per 15 minutes
- Password Reset: 3 attempts per hour
- Admin Panel: 200 requests per 15 minutes
- API Writes: 30 operations per minute

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Security Updates

This document is regularly updated to reflect the latest security measures and best practices implemented in the system.

For questions about security practices or to report vulnerabilities, please create an issue in this repository.
