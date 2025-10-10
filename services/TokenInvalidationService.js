/**
 * Token Invalidation Service
 * 
 * Manages token blacklisting and invalidation for enhanced logout security.
 * Provides server-side token invalidation to prevent replay attacks,
 * especially important for "remember me" functionality.
 */

const crypto = require('crypto');
const CleanupServiceInterface = require('./interfaces/CleanupServiceInterface');

class TokenInvalidationService extends CleanupServiceInterface {
    constructor(authPool = null) {
        super(); // Call parent constructor
        this.authPool = authPool;
        this.invalidatedTokens = new Set(); // In-memory blacklist for immediate checking
        this.cleanupInterval = null;
        
        // Note: cleanup is now managed by CleanupManager
        // this.initializeCleanup(); // Remove auto-initialization
    }

    /**
     * Initialize the service and ensure database tables exist
     * Implementation of CleanupServiceInterface
     */
    async initialize() {
        try {
            await this.createDatabaseTables();
            this.startCleanup();
            console.log('✅ Token invalidation service initialized');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize token invalidation service:', error);
            return false;
        }
    }

    /**
     * Start automatic cleanup operations
     * Implementation of CleanupServiceInterface
     */
    startCleanup() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        
        // Clean up expired tokens every hour
        this.cleanupInterval = setInterval(() => {
            this.performCleanup();
        }, 60 * 60 * 1000);
        
        console.log('✅ Token invalidation cleanup service started');
    }

    /**
     * Stop automatic cleanup operations
     * Implementation of CleanupServiceInterface
     */
    stopCleanup() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
            console.log('🛑 Token invalidation cleanup service stopped');
        }
    }

    /**
     * Perform manual cleanup operation
     * Implementation of CleanupServiceInterface
     */
    async performCleanup() {
        return await this.cleanupExpiredTokens();
    }

    /**
     * Get service status and statistics
     * Implementation of CleanupServiceInterface
     */
    getStatus() {
        return {
            name: 'TokenInvalidationService',
            isActive: !!this.cleanupInterval,
            inMemoryTokenCount: this.invalidatedTokens.size,
            hasDatabaseConnection: !!this.authPool
        };
    }

    /**
     * Create database tables if they don't exist
     */
    async createDatabaseTables() {
        if (!this.authPool) return;

        try {
            const conn = await this.authPool.getConnection();
            
            // Ensure the invalidated_tokens table exists
            await conn.query(`
                CREATE TABLE IF NOT EXISTS invalidated_tokens (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    token_hash VARCHAR(64) NOT NULL UNIQUE,
                    token_type ENUM('session', 'remember', 'reset', 'api') NOT NULL DEFAULT 'session',
                    user_id INT,
                    invalidated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP NOT NULL,
                    reason VARCHAR(100) DEFAULT 'logout',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_token_hash (token_hash),
                    INDEX idx_expires_at (expires_at),
                    INDEX idx_user_id (user_id),
                    INDEX idx_invalidated_at (invalidated_at)
                )
            `);
            
            // Ensure the user_token_invalidation table exists (user_id as primary key to match security schema)
            await conn.query(`
                CREATE TABLE IF NOT EXISTS user_token_invalidation (
                    user_id INT NOT NULL PRIMARY KEY,
                    invalidated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    reason VARCHAR(100) DEFAULT 'security_action',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_invalidated_at (invalidated_at)
                )
            `);
            
            conn.end();
        } catch (error) {
            console.error('Failed to create token invalidation tables:', error);
            throw error;
        }
    }

    /**
     * Invalidate a token (add to blacklist)
     * @param {string} token - The token to invalidate
     * @param {string} tokenType - Type of token ('session', 'remember', 'reset')
     * @param {number} userId - User ID associated with the token
     * @param {string} reason - Reason for invalidation
     */
    async invalidateToken(token, tokenType = 'session', userId = null, reason = 'logout') {
        try {
            const hashedToken = this.hashToken(token);
            const expiryTime = Date.now() + (30 * 24 * 60 * 60 * 1000); // 30 days expiry
            
            // Add to in-memory blacklist immediately
            this.invalidatedTokens.add(hashedToken);
            
            // Store in database if available
            if (this.authPool) {
                const conn = await this.authPool.getConnection();
                await conn.query(
                    `INSERT INTO invalidated_tokens (token_hash, token_type, user_id, invalidated_at, expires_at, reason) 
                     VALUES (?, ?, ?, NOW(), FROM_UNIXTIME(?), ?) 
                     ON DUPLICATE KEY UPDATE invalidated_at = NOW(), reason = ?`,
                    [hashedToken, tokenType, userId, Math.floor(expiryTime / 1000), reason, reason]
                );
                conn.end();
            }
            
            console.log(`🚫 Token invalidated: Type=${tokenType}, Reason=${reason}, User=${userId || 'unknown'}, Token=${hashedToken.substring(0, 8)}...`);
            
            // Add debug stack trace to help identify source of invalidation calls
            if (process.env.NODE_ENV === 'development') {
                console.log('📍 Token invalidation called from:', new Error().stack.split('\n')[2].trim());
            }
            return true;
        } catch (error) {
            console.error('Failed to invalidate token:', error);
            return false;
        }
    }

    /**
     * Check if a token is invalidated
     * @param {string} token - The token to check
     * @returns {boolean} True if token is invalidated
     */
    async isTokenInvalidated(token) {
        try {
            const hashedToken = this.hashToken(token);
            
            // Quick check in memory first
            if (this.invalidatedTokens.has(hashedToken)) {
                return true;
            }
            
            // Check database if available
            if (this.authPool) {
                const conn = await this.authPool.getConnection();
                const result = await conn.query(
                    'SELECT 1 FROM invalidated_tokens WHERE token_hash = ? AND expires_at > NOW() LIMIT 1',
                    [hashedToken]
                );
                conn.end();
                
                if (result.length > 0) {
                    // Add to memory for faster future checks
                    this.invalidatedTokens.add(hashedToken);
                    return true;
                }
            }
            
            return false;
        } catch (error) {
            console.error('Failed to check token invalidation:', error);
            // Fail secure - treat as potentially invalidated
            return true;
        }
    }

    /**
     * Invalidate all tokens for a specific user
     * @param {number} userId - User ID
     * @param {string} reason - Reason for invalidation
     */
    async invalidateAllUserTokens(userId, reason = 'security_action') {
        try {
            if (this.authPool) {
                const conn = await this.authPool.getConnection();
                
                // Get all active session tokens for user and invalidate them
                // This would require tracking session tokens in database
                // For now, we mark user for token invalidation
                await conn.query(
                    `INSERT INTO user_token_invalidation (user_id, invalidated_at, reason) 
                     VALUES (?, NOW(), ?) 
                     ON DUPLICATE KEY UPDATE invalidated_at = NOW(), reason = ?`,
                    [userId, reason, reason]
                );
                
                conn.end();
            }
            
            console.log(`🚫 All tokens invalidated for user: ${userId}, Reason: ${reason}`);
            return true;
        } catch (error) {
            console.error('Failed to invalidate user tokens:', error);
            return false;
        }
    }

    /**
     * Check if all user tokens should be considered invalidated
     * @param {number} userId - User ID
     * @param {number} tokenIssuedAt - When the token was issued (timestamp)
     */
    async areUserTokensInvalidated(userId, tokenIssuedAt) {
        try {
            if (this.authPool) {
                const conn = await this.authPool.getConnection();
                const result = await conn.query(
                    'SELECT invalidated_at FROM user_token_invalidation WHERE user_id = ? AND invalidated_at > FROM_UNIXTIME(?)',
                    [userId, Math.floor(tokenIssuedAt / 1000)]
                );
                conn.end();
                
                return result.length > 0;
            }
            
            return false;
        } catch (error) {
            console.error('Failed to check user token invalidation:', error);
            return false;
        }
    }

    /**
     * Clean up expired invalidated tokens
     */
    async cleanupExpiredTokens() {
        try {
            let cleanedCount = 0;
            
            if (this.authPool) {
                const conn = await this.authPool.getConnection();
                
                // Clean up expired tokens from database
                const result = await conn.query('DELETE FROM invalidated_tokens WHERE expires_at < NOW()');
                cleanedCount += result.affectedRows || 0;
                
                // Clean up old user invalidation records (older than 90 days)
                await conn.query('DELETE FROM user_token_invalidation WHERE invalidated_at < DATE_SUB(NOW(), INTERVAL 90 DAY)');
                
                conn.end();
            }
            
            // Clear in-memory cache (we'll rebuild it as needed)
            this.invalidatedTokens.clear();
            
            if (cleanedCount > 0) {
                console.log(`🧹 Cleaned up ${cleanedCount} expired invalidated tokens`);
            }
        } catch (error) {
            console.error('Failed to cleanup expired tokens:', error);
        }
    }

    /**
     * Hash a token for secure storage
     * @param {string} token - Token to hash
     * @returns {string} Hashed token
     */
    hashToken(token) {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    /**
     * Get invalidation statistics
     */
    async getInvalidationStats() {
        try {
            const stats = {
                memoryBlacklistSize: this.invalidatedTokens.size,
                totalInvalidatedTokens: 0,
                activeInvalidatedTokens: 0,
                invalidatedUsers: 0
            };
            
            if (this.authPool) {
                const conn = await this.authPool.getConnection();
                
                // Get total invalidated tokens
                const totalResult = await conn.query('SELECT COUNT(*) as count FROM invalidated_tokens');
                stats.totalInvalidatedTokens = totalResult[0].count;
                
                // Get active invalidated tokens
                const activeResult = await conn.query('SELECT COUNT(*) as count FROM invalidated_tokens WHERE expires_at > NOW()');
                stats.activeInvalidatedTokens = activeResult[0].count;
                
                // Get invalidated users
                const usersResult = await conn.query('SELECT COUNT(*) as count FROM user_token_invalidation');
                stats.invalidatedUsers = usersResult[0].count;
                
                conn.end();
            }
            
            return stats;
        } catch (error) {
            console.error('Failed to get invalidation stats:', error);
            return {
                memoryBlacklistSize: this.invalidatedTokens.size,
                totalInvalidatedTokens: 0,
                activeInvalidatedTokens: 0,
                invalidatedUsers: 0,
                error: error.message
            };
        }
    }
}

module.exports = TokenInvalidationService;
