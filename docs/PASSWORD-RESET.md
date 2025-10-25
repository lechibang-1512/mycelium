# Password Reset Feature Documentation

## Overview
The password reset feature allows users to securely reset their passwords through a token-based system. Tokens are sent via email and expire after 60 minutes for security.

## Architecture

### Components

1. **PasswordResetService** (`/services/PasswordResetService.js`)
   - Handles token generation, validation, and management
   - Uses SHA-256 hashing for secure token storage
   - Provides cleanup methods for expired tokens

2. **EmailService** (`/services/EmailService.js`)
   - Manages email sending through SMTP
   - Provides HTML and plain text templates
   - Supports connection verification

3. **Routes** (`/routes/auth.js`)
   - `GET /forgot-password` - Display forgot password form
   - `POST /forgot-password` - Process forgot password request
   - `GET /reset-password/:token` - Display reset password form
   - `POST /reset-password/:token` - Process password reset

4. **Views** (`/views/`)
   - `forgot-password.ejs` - Forgot password form
   - `reset-password.ejs` - Reset password form with validation

5. **Database** (`password_reset_tokens` table)
   - Stores hashed tokens with expiration
   - Tracks token usage
   - Foreign key to users table

## Security Features

### Token Security
- **Random Generation**: 32 bytes (256 bits) of cryptographically secure random data
- **URL-Safe Encoding**: Base64url encoding for safe URL transmission
- **Hashing**: SHA-256 hash stored in database (plain token never stored)
- **Expiration**: 60-minute token lifetime
- **Single Use**: Tokens marked as used after successful reset
- **Invalidation**: Previous unused tokens invalidated when new token generated

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- At least one special character (!@#$%^&*)

### Additional Security Measures
- **Timing Attack Prevention**: Same success message shown whether email exists or not
- **Session Invalidation**: All user sessions terminated after password reset
- **Security Logging**: Password reset events logged to security_events table
- **Rate Limiting**: Protected by existing rate limiting middleware
- **CSRF Protection**: All forms protected by CSRF tokens

## Setup Instructions

### 1. Run Setup Script
```bash
node scripts/setup-password-reset.js
```

This will:
- Install nodemailer package
- Create password_reset_tokens table
- Add SMTP configuration to .env file

### 2. Configure SMTP Settings

Edit your `.env` file with your SMTP credentials:

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM="Inventory Management" <noreply@inventory.com>
```

#### Gmail Configuration
1. Enable 2-factor authentication on your Google account
2. Generate an app password: https://myaccount.google.com/apppasswords
3. Use the app password in SMTP_PASS

#### Other SMTP Services
- **SendGrid**: Use `smtp.sendgrid.net`, port 587
- **Mailgun**: Use `smtp.mailgun.org`, port 587
- **AWS SES**: Use regional endpoint, port 587
- **Mailtrap** (development): Use mailtrap.io credentials

### 3. Verify Email Configuration

```bash
node -e "require('./services/EmailService').verifyConnection()"
```

### 4. Restart Server

```bash
npm run dev
```

## Usage

### User Flow

1. **Request Reset**
   - User visits `/forgot-password`
   - Enters email address
   - Submits form

2. **Token Generation**
   - System finds user by email
   - Generates secure random token
   - Stores hashed token in database
   - Sends email with reset link

3. **Reset Password**
   - User clicks link in email
   - Visits `/reset-password/:token`
   - System validates token (not expired, not used)
   - User enters new password
   - System updates password and marks token as used

4. **Security Actions**
   - All user sessions invalidated
   - Security event logged
   - User redirected to login

### Development Mode

In development, when EmailService is not configured, the reset URL is logged to console:

```
================================================================================
PASSWORD RESET REQUEST
================================================================================
User: John Doe (john@example.com)
Reset URL: http://localhost:3000/reset-password/ABC123...
Token expires in: 60 minutes
================================================================================
```

## API Reference

### PasswordResetService

#### `generateResetToken()`
Generates a secure random token (32 bytes, base64url encoded).

**Returns**: `string` - The generated token

---

#### `hashToken(token)`
Creates a SHA-256 hash of the token for secure storage.

**Parameters**:
- `token` (string) - Plain text token

**Returns**: `string` - Hex-encoded hash

---

#### `createResetToken(userId, expirationMinutes)`
Complete workflow: generates token, hashes it, saves to database.

**Parameters**:
- `userId` (number) - User ID
- `expirationMinutes` (number) - Token lifetime (default: 60)

**Returns**: `Promise<{token: string, tokenHash: string}>`

---

#### `validateResetToken(token)`
Validates token and returns user information if valid.

**Parameters**:
- `token` (string) - Plain text token

**Returns**: `Promise<{valid: boolean, userId?: number, error?: string}>`

---

#### `markTokenAsUsed(token)`
Marks token as used after successful password reset.

**Parameters**:
- `token` (string) - Plain text token

**Returns**: `Promise<void>`

---

#### `cleanupExpiredTokens(daysOld)`
Deletes expired tokens older than specified days.

**Parameters**:
- `daysOld` (number) - Delete tokens older than this (default: 7)

**Returns**: `Promise<number>` - Number of deleted tokens

---

### EmailService

#### `sendPasswordResetEmail(to, fullName, resetUrl)`
Sends password reset email with HTML and text versions.

**Parameters**:
- `to` (string) - Recipient email
- `fullName` (string) - Recipient name
- `resetUrl` (string) - Reset URL with token

**Returns**: `Promise<void>`

---

#### `verifyConnection()`
Tests SMTP connection.

**Returns**: `Promise<boolean>`

---

## Database Schema

```sql
CREATE TABLE `password_reset_tokens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `token_hash` varchar(64) NOT NULL,
  `expires_at` timestamp NOT NULL,
  `used_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `token_hash` (`token_hash`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_expires_at` (`expires_at`),
  KEY `idx_used_at` (`used_at`),
  CONSTRAINT `fk_password_reset_user` 
    FOREIGN KEY (`user_id`) 
    REFERENCES `users` (`id`) 
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
```

## Maintenance

### Cleanup Expired Tokens

Run periodically (via cron job or scheduled task):

```javascript
const PasswordResetService = require('./services/PasswordResetService');

// Delete tokens expired more than 7 days ago
PasswordResetService.cleanupExpiredTokens(7)
  .then(count => console.log(`Deleted ${count} expired tokens`))
  .catch(err => console.error('Cleanup error:', err));
```

Or directly in MySQL:

```sql
DELETE FROM password_reset_tokens 
WHERE expires_at < DATE_SUB(NOW(), INTERVAL 7 DAY);
```

### Monitor Security Events

```sql
SELECT * FROM security_events 
WHERE event_type = 'password_change' 
ORDER BY created_at DESC 
LIMIT 100;
```

## Testing

### Test Token Generation
```javascript
const PasswordResetService = require('./services/PasswordResetService');

const token = PasswordResetService.generateResetToken();
console.log('Token:', token);
console.log('Hash:', PasswordResetService.hashToken(token));
```

### Test Email Sending
```javascript
const EmailService = require('./services/EmailService');

EmailService.sendTestEmail('your-email@example.com')
  .then(() => console.log('Test email sent'))
  .catch(err => console.error('Error:', err));
```

### Manual Testing Flow
1. Visit http://localhost:3000/forgot-password
2. Enter a valid user email
3. Check console for reset URL (development mode)
4. Visit the reset URL
5. Enter new password
6. Verify login with new password

## Troubleshooting

### Email Not Sending

**Check SMTP Configuration**:
```javascript
const EmailService = require('./services/EmailService');
EmailService.verifyConnection();
```

**Common Issues**:
- Wrong credentials: Verify SMTP_USER and SMTP_PASS
- Port blocked: Try different ports (587, 465, 25)
- SSL/TLS: Toggle SMTP_SECURE setting
- Firewall: Check if SMTP ports are allowed

### Token Validation Fails

**Check Token in Database**:
```sql
SELECT * FROM password_reset_tokens 
WHERE token_hash = SHA2('YOUR_TOKEN', 256);
```

**Common Issues**:
- Token expired: Generate new token
- Token already used: Check used_at column
- Token not found: May have been invalidated

### Password Not Updating

**Check Error Logs**:
- Check browser console for validation errors
- Check server logs for database errors
- Verify password meets requirements

## Security Considerations

1. **Never log tokens in production** - Remove console.log statements
2. **Use HTTPS** - Reset URLs must be transmitted over secure connection
3. **Rate limit** - Protect /forgot-password endpoint from abuse
4. **Monitor** - Watch for unusual password reset patterns
5. **Email security** - Use SPF, DKIM, DMARC for email authentication
6. **Token rotation** - Consider shorter expiration for high-security environments

## Future Enhancements

- [ ] Multi-language email templates
- [ ] SMS-based password reset option
- [ ] Password reset history tracking
- [ ] Admin notification for bulk reset attempts
- [ ] Custom token expiration per user role
- [ ] Password history (prevent reuse)
- [ ] Account recovery questions
- [ ] Integration with 2FA systems
