const crypto = require('crypto');
const { authPool } = require('../config/auth-database');

class PasswordResetService {
    /**
     * Generate a secure random token
     * @returns {string} URL-safe base64 encoded token
     */
    static generateResetToken() {
        // Generate 32 random bytes (256 bits) for strong security
        const token = crypto.randomBytes(32).toString('base64url');
        return token;
    }

    /**
     * Hash a token for secure storage
     * @param {string} token - The plain text token
     * @returns {string} SHA-256 hash of the token
     */
    static hashToken(token) {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    /**
     * Save a password reset token to the database
     * @param {number} userId - The user ID
     * @param {string} tokenHash - The hashed token
     * @param {number} expirationMinutes - Token expiration time in minutes (default: 60)
     * @returns {Promise<void>}
     */
    static async saveResetToken(userId, tokenHash, expirationMinutes = 60) {
        const connection = await authPool.getConnection();
        try {
            // Calculate expiration time
            const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

            // Invalidate any previous unused tokens for this user
            await connection.query(
                'UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL',
                [userId]
            );

            // Insert new token
            await connection.query(
                `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
                 VALUES (?, ?, ?)`,
                [userId, tokenHash, expiresAt]
            );
        } finally {
            connection.release();
        }
    }

    /**
     * Validate a reset token and return user information
     * @param {string} token - The plain text token
     * @returns {Promise<{valid: boolean, userId?: number, error?: string}>}
     */
    static async validateResetToken(token) {
        const connection = await authPool.getConnection();
        try {
            const tokenHash = this.hashToken(token);

            // Find the token in the database
            const [rows] = await connection.query(
                `SELECT id, user_id, expires_at, used_at
                 FROM password_reset_tokens
                 WHERE token_hash = ?`,
                [tokenHash]
            );

            // Token not found
            if (rows.length === 0) {
                return { valid: false, error: 'Invalid or expired reset token' };
            }

            const tokenData = rows[0];

            // Token already used
            if (tokenData.used_at !== null) {
                return { valid: false, error: 'This reset token has already been used' };
            }

            // Token expired
            if (new Date() > new Date(tokenData.expires_at)) {
                return { valid: false, error: 'This reset token has expired' };
            }

            // Token is valid
            return { valid: true, userId: tokenData.user_id };
        } finally {
            connection.release();
        }
    }

    /**
     * Mark a reset token as used
     * @param {string} token - The plain text token
     * @returns {Promise<void>}
     */
    static async markTokenAsUsed(token) {
        const connection = await authPool.getConnection();
        try {
            const tokenHash = this.hashToken(token);

            await connection.query(
                'UPDATE password_reset_tokens SET used_at = NOW() WHERE token_hash = ?',
                [tokenHash]
            );
        } finally {
            connection.release();
        }
    }

    /**
     * Create a complete reset token with hash
     * @param {number} userId - The user ID
     * @param {number} expirationMinutes - Token expiration time in minutes
     * @returns {Promise<{token: string, tokenHash: string}>}
     */
    static async createResetToken(userId, expirationMinutes = 60) {
        const token = this.generateResetToken();
        const tokenHash = this.hashToken(token);
        await this.saveResetToken(userId, tokenHash, expirationMinutes);
        return { token, tokenHash };
    }

    /**
     * Clean up expired tokens (should be called periodically)
     * @param {number} daysOld - Delete tokens older than this many days (default: 7)
     * @returns {Promise<number>} Number of deleted tokens
     */
    static async cleanupExpiredTokens(daysOld = 7) {
        const connection = await authPool.getConnection();
        try {
            const [result] = await connection.query(
                'DELETE FROM password_reset_tokens WHERE expires_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
                [daysOld]
            );
            return result.affectedRows;
        } finally {
            connection.release();
        }
    }

    /**
     * Get user by username or email
     * @param {string} identifier - Username or email
     * @returns {Promise<{id: number, username: string, email: string, fullName: string} | null>}
     */
    static async getUserByIdentifier(identifier) {
        const connection = await authPool.getConnection();
        try {
            const [rows] = await connection.query(
                `SELECT id, username, email, fullName, is_active
                 FROM users
                 WHERE (username = ? OR email = ?) AND is_active = 1`,
                [identifier, identifier]
            );

            return rows.length > 0 ? rows[0] : null;
        } finally {
            connection.release();
        }
    }
}

module.exports = PasswordResetService;
