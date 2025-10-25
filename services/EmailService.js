const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        // Initialize transporter with environment variables
        // For development, you can use services like Mailtrap, SendGrid, or Gmail
        this.transporter = nodemailer.createTransporter({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: process.env.SMTP_PORT || 587,
            secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        this.from = process.env.EMAIL_FROM || '"Inventory Management" <noreply@inventory.com>';
    }

    /**
     * Send a password reset email
     * @param {string} to - Recipient email address
     * @param {string} fullName - Recipient's full name
     * @param {string} resetUrl - Password reset URL with token
     * @returns {Promise<void>}
     */
    async sendPasswordResetEmail(to, fullName, resetUrl) {
        const mailOptions = {
            from: this.from,
            to: to,
            subject: 'Password Reset Request',
            html: this.getPasswordResetTemplate(fullName, resetUrl),
            text: this.getPasswordResetTextTemplate(fullName, resetUrl)
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log('Password reset email sent:', info.messageId);
            return info;
        } catch (error) {
            console.error('Error sending password reset email:', error);
            throw error;
        }
    }

    /**
     * HTML template for password reset email
     * @param {string} fullName - Recipient's full name
     * @param {string} resetUrl - Password reset URL
     * @returns {string} HTML email template
     */
    getPasswordResetTemplate(fullName, resetUrl) {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .container {
            background-color: #f9f9f9;
            border-radius: 5px;
            padding: 30px;
        }
        .header {
            background-color: #007bff;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 5px 5px 0 0;
            margin: -30px -30px 20px -30px;
        }
        .button {
            display: inline-block;
            padding: 12px 30px;
            background-color: #007bff;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
        }
        .footer {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 12px;
            color: #666;
        }
        .warning {
            background-color: #fff3cd;
            border: 1px solid #ffc107;
            border-radius: 5px;
            padding: 15px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Password Reset Request</h1>
        </div>
        
        <p>Hello ${fullName},</p>
        
        <p>We received a request to reset your password for your Inventory Management account. Click the button below to create a new password:</p>
        
        <center>
            <a href="${resetUrl}" class="button">Reset Password</a>
        </center>
        
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 3px;">
            ${resetUrl}
        </p>
        
        <div class="warning">
            <strong>⚠️ Security Notice:</strong>
            <ul>
                <li>This link will expire in 60 minutes</li>
                <li>If you didn't request this password reset, please ignore this email</li>
                <li>Never share this link with anyone</li>
            </ul>
        </div>
        
        <div class="footer">
            <p>This is an automated message, please do not reply to this email.</p>
            <p>&copy; ${new Date().getFullYear()} Inventory Management System. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        `.trim();
    }

    /**
     * Plain text template for password reset email
     * @param {string} fullName - Recipient's full name
     * @param {string} resetUrl - Password reset URL
     * @returns {string} Plain text email template
     */
    getPasswordResetTextTemplate(fullName, resetUrl) {
        return `
Hello ${fullName},

We received a request to reset your password for your Inventory Management account.

To reset your password, please visit the following link:
${resetUrl}

This link will expire in 60 minutes.

SECURITY NOTICE:
- If you didn't request this password reset, please ignore this email
- Never share this link with anyone
- Contact support if you have any concerns

This is an automated message, please do not reply to this email.

© ${new Date().getFullYear()} Inventory Management System. All rights reserved.
        `.trim();
    }

    /**
     * Verify SMTP connection
     * @returns {Promise<boolean>}
     */
    async verifyConnection() {
        try {
            await this.transporter.verify();
            console.log('SMTP connection verified successfully');
            return true;
        } catch (error) {
            console.error('SMTP connection verification failed:', error);
            return false;
        }
    }

    /**
     * Send a test email (for development/testing)
     * @param {string} to - Test recipient email
     * @returns {Promise<void>}
     */
    async sendTestEmail(to) {
        const mailOptions = {
            from: this.from,
            to: to,
            subject: 'Test Email - Inventory Management System',
            html: '<h1>Test Email</h1><p>This is a test email from your Inventory Management System.</p>',
            text: 'Test Email\n\nThis is a test email from your Inventory Management System.'
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log('Test email sent:', info.messageId);
            return info;
        } catch (error) {
            console.error('Error sending test email:', error);
            throw error;
        }
    }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService;
