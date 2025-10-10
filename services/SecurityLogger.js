/**
 * Enhanced Security Logging Service
 * 
 * Provides comprehensive security event logging and monitoring
 * to help detect and respond to security incidents.
 */

const CleanupServiceInterface = require('./interfaces/CleanupServiceInterface');

class SecurityLogger extends CleanupServiceInterface {
    constructor(authPool = null, convertBigIntToNumber = null, securityDbPool = null) {
        super(); // Call parent constructor
        this.authPool = authPool;
        this.securityDbPool = securityDbPool || authPool; // Use separate security db pool if provided, otherwise use auth pool
        this.convertBigIntToNumber = convertBigIntToNumber;
        this.eventBuffer = [];
        this.bufferFlushInterval = null;
        this.maxBufferSize = 100;
        this.flushIntervalMs = 30000; // 30 seconds
        
        // Note: initialization is now managed by CleanupManager
        // this.initializeBufferFlushing(); // Remove auto-initialization
    }

    /**
     * Initialize the service and ensure database tables exist
     * Implementation of CleanupServiceInterface
     */
    async initialize() {
        try {
            await this.createDatabaseTables();
            this.startCleanup();
            console.log('✅ Security logging service initialized');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize security logging service:', error);
            return false;
        }
    }

    /**
     * Start automatic cleanup operations (buffer flushing)
     * Implementation of CleanupServiceInterface
     */
    startCleanup() {
        if (this.bufferFlushInterval) {
            clearInterval(this.bufferFlushInterval);
        }
        
        this.bufferFlushInterval = setInterval(() => {
            this.performCleanup();
        }, this.flushIntervalMs);
        
        console.log('✅ Security logging buffer flushing started');
    }

    /**
     * Stop automatic cleanup operations
     * Implementation of CleanupServiceInterface
     */
    stopCleanup() {
        if (this.bufferFlushInterval) {
            clearInterval(this.bufferFlushInterval);
            this.bufferFlushInterval = null;
            console.log('🛑 Security logging buffer flushing stopped');
        }
    }

    /**
     * Perform manual cleanup operation (flush buffer)
     * Implementation of CleanupServiceInterface
     */
    async performCleanup() {
        return await this.flushEventBuffer();
    }

    /**
     * Get service status and statistics
     * Implementation of CleanupServiceInterface
     */
    getStatus() {
        return {
            name: 'SecurityLogger',
            isActive: !!this.bufferFlushInterval,
            bufferedEvents: this.eventBuffer.length,
            maxBufferSize: this.maxBufferSize,
            flushInterval: this.flushIntervalMs,
            hasDatabaseConnection: !!this.securityDbPool
        };
    }

    /**
     * Create database tables if they don't exist
     */
    async createDatabaseTables() {
        try {
            if (this.securityDbPool) {
                const conn = await this.securityDbPool.getConnection();
                
                // Ensure the security_events table exists (details stored as LONGTEXT for compatibility)
                await conn.query(`
                    CREATE TABLE IF NOT EXISTS security_events (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        event_type ENUM('login','logout','failed_login','login_success','session_hijack','token_invalidation','password_change','account_lockout') NOT NULL,
                        user_id INT DEFAULT NULL,
                        username VARCHAR(50) DEFAULT NULL,
                        ip_address VARCHAR(45) DEFAULT NULL,
                        user_agent TEXT DEFAULT NULL,
                        session_id VARCHAR(32) DEFAULT NULL,
                        details LONGTEXT DEFAULT NULL,
                        risk_level ENUM('low','medium','high','critical') DEFAULT 'low',
                        created_at TIMESTAMP NULL DEFAULT current_timestamp(),
                        INDEX idx_event_type (event_type),
                        INDEX idx_user_id (user_id),
                        INDEX idx_created_at (created_at),
                        INDEX idx_risk_level (risk_level),
                        INDEX idx_ip_address (ip_address)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                `);
                
                conn.end();
            }
            
            // Initialize failed login attempts table in the auth database
            if (this.authPool) {
                const authConn = await this.authPool.getConnection();
                
                // Ensure the failed_login_attempts table exists (identifier_type values lowercase)
                await authConn.query(`
                    CREATE TABLE IF NOT EXISTS failed_login_attempts (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        identifier VARCHAR(100) NOT NULL,
                        identifier_type ENUM('username','email','ip') NOT NULL,
                        ip_address VARCHAR(45) DEFAULT NULL,
                        user_agent TEXT DEFAULT NULL,
                        attempt_time TIMESTAMP NULL DEFAULT current_timestamp(),
                        INDEX idx_identifier (identifier, identifier_type),
                        INDEX idx_ip_address (ip_address),
                        INDEX idx_attempt_time (attempt_time)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                `);
                
                authConn.end();
            }
        } catch (error) {
            console.error('Failed to create security logging tables:', error);
            throw error;
        }
    }

    /**
     * Log a security event
     */
    async logSecurityEvent(eventType, details = {}) {
        // Ensure eventType is a string
        let cleanEventType = eventType;
        if (typeof eventType === 'object') {
            cleanEventType = JSON.stringify(eventType);
        }
        cleanEventType = String(cleanEventType || '').substring(0, 50);
        
        const event = {
            event_type: cleanEventType,
            user_id: details.userId || null,
            username: details.username || null,
            ip_address: details.ipAddress || null,
            user_agent: details.userAgent || null,
            session_id: details.sessionId || null,
            details: JSON.stringify(details.additionalData || {}, (key, value) =>
                typeof value === 'bigint' ? Number(value) : value
            ),
            risk_level: this.calculateRiskLevel(cleanEventType, details),
            timestamp: Date.now()
        };

        // Add to buffer
        this.eventBuffer.push(event);
        
        // Flush buffer if it's getting full
        if (this.eventBuffer.length >= this.maxBufferSize) {
            await this.flushEventBuffer();
        }

        // Log to console for immediate visibility
        const riskEmoji = this.getRiskEmoji(event.risk_level);
        console.log(`${riskEmoji} Security Event: ${cleanEventType} | User: ${details.username || 'unknown'} | Risk: ${event.risk_level}`);
    }

    /**
     * Normalize arbitrary eventType strings to the allowed enum values for the DB.
     */
    normalizeEventTypeForDb(eventType) {
        if (!eventType || typeof eventType !== 'string') return 'login';
        const lower = eventType.toLowerCase();
        const mapping = {
            'login': 'login',
            'logout': 'logout',
            'failed_login': 'failed_login',
            'login_success': 'login_success',
            'session_hijack': 'session_hijack',
            'token_invalidation': 'token_invalidation',
            'password_change': 'password_change',
            'account_lockout': 'account_lockout'
        };

        // Direct match
        if (mapping[lower]) return mapping[lower];

        // Map common application-specific events to nearest enum
        if (lower.includes('password')) return 'password_change';
        if (lower.includes('token')) return 'token_invalidation';
        if (lower.includes('lock') || lower.includes('unlock')) return 'account_lockout';
        if (lower.includes('session') || lower.includes('hijack')) return 'session_hijack';
        if (lower.includes('login')) return lower.includes('fail') ? 'failed_login' : 'login';

        // Fallback
        return 'login';
    }

    /**
     * Log login attempt
     */
    async logLoginAttempt(success, username, ipAddress, userAgent, userId = null, additionalData = {}) {
        const eventType = success ? 'login' : 'failed_login';
        await this.logSecurityEvent(eventType, {
            userId,
            username,
            ipAddress,
            userAgent,
            additionalData: {
                success,
                ...additionalData
            }
        });

        // Track failed login attempts separately
        if (!success) {
            await this.trackFailedLoginAttempt(username, ipAddress, userAgent);
        }
    }

    /**
     * Log logout event
     */
    async logLogout(userId, username, sessionId, ipAddress, reason = 'user_action') {
        await this.logSecurityEvent('logout', {
            userId,
            username,
            sessionId,
            ipAddress,
            additionalData: { reason }
        });
    }

    /**
     * Log session hijacking attempt
     */
    async logSessionHijackAttempt(userId, username, sessionId, oldIP, newIP, oldUserAgent, newUserAgent) {
        await this.logSecurityEvent('session_hijack', {
            userId,
            username,
            sessionId,
            ipAddress: newIP,
            userAgent: newUserAgent,
            additionalData: {
                oldIP,
                newIP,
                oldUserAgent,
                newUserAgent,
                violation_type: 'suspicious_session_activity'
            }
        });

        // Also log to session security violations table
        await this.logSessionViolation(sessionId, userId, 'ip_change', oldIP, newIP, newIP, newUserAgent);
    }

    /**
     * Log password change
     */
    async logPasswordChange(userId, username, ipAddress, userAgent, forced = false) {
        await this.logSecurityEvent('password_change', {
            userId,
            username,
            ipAddress,
            userAgent,
            additionalData: { forced }
        });
    }

    /**
     * Log token invalidation
     */
    async logTokenInvalidation(userId, username, tokenType, reason, ipAddress = null) {
        await this.logSecurityEvent('token_invalidation', {
            userId,
            username,
            ipAddress,
            additionalData: {
                tokenType,
                reason
            }
        });
    }

    /**
     * Track failed login attempts
     */
    async trackFailedLoginAttempt(identifier, ipAddress, userAgent) {
        try {
            if (!this.authPool) return;

            const conn = await this.authPool.getConnection();
            
            // Determine identifier type
            const identifierType = this.determineIdentifierType(identifier);
            
            await conn.query(
                'INSERT INTO failed_login_attempts (identifier, identifier_type, ip_address, user_agent) VALUES (?, ?, ?, ?)',
                [identifier, identifierType, ipAddress, userAgent]
            );
            
            conn.end();
        } catch (error) {
            console.error('Failed to track failed login attempt:', error);
        }
    }

    /**
     * Log session security violation
     */
    async logSessionViolation(sessionId, userId, violationType, oldValue, newValue, ipAddress, userAgent, actionTaken = 'logged') {
        try {
            if (!this.authPool) return;

            const conn = await this.authPool.getConnection();
            await conn.query(
                `INSERT INTO session_security_violations 
                 (session_id, user_id, violation_type, old_value, new_value, ip_address, user_agent, action_taken) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [sessionId, userId, violationType, oldValue, newValue, ipAddress, userAgent, actionTaken]
            );
            conn.end();
        } catch (error) {
            console.error('Failed to log session violation:', error);
        }
    }

    /**
     * Check for suspicious login patterns
     */
    async checkSuspiciousActivity(identifier, ipAddress) {
        try {
            if (!this.authPool) return { suspicious: false };

            const conn = await this.authPool.getConnection();
            
            // Check failed attempts in last hour
            const recentFailures = await conn.query(
                `SELECT COUNT(*) as count FROM failed_login_attempts 
                 WHERE (identifier = ? OR ip_address = ?) 
                 AND attempt_time > DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
                [identifier, ipAddress]
            );
            
            // Check for multiple IPs for same identifier
            const ipVariations = await conn.query(
                `SELECT COUNT(DISTINCT ip_address) as count FROM failed_login_attempts 
                 WHERE identifier = ? 
                 AND attempt_time > DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
                [identifier]
            );
            
            conn.end();
            
            const failureCount = recentFailures[0].count;
            const ipCount = ipVariations[0].count;
            
            return {
                suspicious: failureCount >= 3 || ipCount >= 5,
                failureCount,
                ipCount,
                riskLevel: this.calculateActivityRiskLevel(failureCount, ipCount)
            };
        } catch (error) {
            console.error('Failed to check suspicious activity:', error);
            return { suspicious: false, error: error.message };
        }
    }

    /**
     * Flush event buffer to database
     */
    async flushEventBuffer() {
        if (this.eventBuffer.length === 0 || !this.securityDbPool) return;

        const events = [...this.eventBuffer];
        this.eventBuffer = [];

        try {
            const conn = await this.securityDbPool.getConnection();
            
            for (const event of events) {
                // Ensure event_type is a string - handle object case
                let eventType = event.event_type;
                if (typeof eventType === 'object') {
                    eventType = JSON.stringify(eventType);
                }
                eventType = String(eventType || '').substring(0, 50);
                
                const dbEventType = this.normalizeEventTypeForDb(eventType);
                await conn.query(
                    `INSERT INTO security_events 
                     (event_type, user_id, username, ip_address, user_agent, session_id, details, risk_level) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        dbEventType,
                        event.user_id,
                        event.username,
                        event.ip_address,
                        event.user_agent,
                        event.session_id,
                        event.details,
                        event.risk_level
                    ]
                );
            }
            
            conn.end();
            
            if (events.length > 0) {
                console.log(`📊 Flushed ${events.length} security events to database`);
            }
        } catch (error) {
            console.error('Failed to flush security events:', error);
            // Put events back in buffer to retry later
            this.eventBuffer.unshift(...events);
        }
    }

    /**
     * Calculate risk level for an event
     */
    calculateRiskLevel(eventType, details) {
        switch (eventType) {
            case 'failed_login':
                return details.additionalData?.consecutiveFailures >= 3 ? 'high' : 'medium';
            case 'session_hijack':
                return 'critical';
            case 'account_lockout':
                return 'high';
            case 'token_invalidation':
                return details.additionalData?.reason === 'security_violation' ? 'high' : 'low';
            case 'password_change':
                return details.additionalData?.forced ? 'medium' : 'low';
            case 'login':
            case 'login_success':
                return 'low';
            case 'logout':
                return 'low';
            default:
                return 'medium';
        }
    }

    /**
     * Calculate activity risk level
     */
    calculateActivityRiskLevel(failureCount, ipCount) {
        if (failureCount >= 10 || ipCount >= 10) return 'critical';
        if (failureCount >= 5 || ipCount >= 7) return 'high';
        if (failureCount >= 3 || ipCount >= 5) return 'medium';
        return 'low';
    }

    /**
     * Determine identifier type
     */
    determineIdentifierType(identifier) {
        if (identifier.includes('@')) return 'email';
        if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(identifier)) return 'ip';
        return 'username';
    }

    /**
     * Get risk emoji for logging
     */
    getRiskEmoji(riskLevel) {
        switch (riskLevel) {
            case 'critical': return '🚨';
            case 'high': return '⚠️';
            case 'medium': return '🔶';
            case 'low': return '🔵';
            default: return '⚪';
        }
    }

    /**
     * Get security dashboard data
     */
    async getSecurityDashboard(days = 7) {
        try {
            if (!this.securityDbPool) return null;

            const conn = await this.securityDbPool.getConnection();
            
            // Get recent security events summary
            const eventsSummary = await conn.query(
                `SELECT event_type, risk_level, COUNT(*) as count, 
                        COUNT(DISTINCT user_id) as unique_users,
                        COUNT(DISTINCT ip_address) as unique_ips
                 FROM security_events 
                 WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                 GROUP BY event_type, risk_level
                 ORDER BY count DESC`,
                [days]
            );

            // Get failed login summary from auth database
            let failedLogins = [];
            if (this.authPool) {
                const authConn = await this.authPool.getConnection();
                failedLogins = await authConn.query(
                    `SELECT DATE(attempt_time) as date, COUNT(*) as attempts,
                            COUNT(DISTINCT identifier) as unique_identifiers
                     FROM failed_login_attempts 
                     WHERE attempt_time >= DATE_SUB(NOW(), INTERVAL ? DAY)
                     GROUP BY DATE(attempt_time)
                     ORDER BY date DESC`,
                    [days]
                );
                authConn.end();
            }

            // Get top risk IPs
            const riskIPs = await conn.query(
                `SELECT ip_address, COUNT(*) as events,
                        AVG(CASE WHEN risk_level = 'critical' THEN 4
                                 WHEN risk_level = 'high' THEN 3
                                 WHEN risk_level = 'medium' THEN 2
                                 ELSE 1 END) as avg_risk_score
                 FROM security_events 
                 WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                   AND ip_address IS NOT NULL
                 GROUP BY ip_address
                 HAVING events >= 5
                 ORDER BY avg_risk_score DESC, events DESC
                 LIMIT 10`,
                [days]
            );

            conn.end();

            return {
                eventsSummary: this.convertBigIntToNumber ? eventsSummary.map(this.convertBigIntToNumber) : eventsSummary,
                failedLogins: this.convertBigIntToNumber ? failedLogins.map(this.convertBigIntToNumber) : failedLogins,
                riskIPs: this.convertBigIntToNumber ? riskIPs.map(this.convertBigIntToNumber) : riskIPs,
                generatedAt: new Date().toISOString()
            };
        } catch (error) {
            console.error('Failed to get security dashboard:', error);
            return { error: error.message };
        }
    }

    /**
     * Initialize the service and ensure database tables exist
     */
    async initialize() {
        try {
            if (this.securityDbPool) {
                const conn = await this.securityDbPool.getConnection();
                
                // Ensure the security_events table exists
                await conn.query(`
                    CREATE TABLE IF NOT EXISTS security_events (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        event_type ENUM('login', 'logout', 'failed_login', 'login_success', 'session_hijack', 'token_invalidation', 'password_change', 'account_lockout') NOT NULL,
                        user_id INT,
                        username VARCHAR(50),
                        ip_address VARCHAR(45),
                        user_agent TEXT,
                        session_id VARCHAR(32),
                        details JSON,
                        risk_level ENUM('low', 'medium', 'high', 'critical') DEFAULT 'low',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        INDEX idx_event_type (event_type),
                        INDEX idx_user_id (user_id),
                        INDEX idx_created_at (created_at),
                        INDEX idx_risk_level (risk_level),
                        INDEX idx_ip_address (ip_address)
                    )
                `);
                
                conn.end();
            }
            
            // Initialize failed login attempts table in the auth database
            if (this.authPool) {
                const authConn = await this.authPool.getConnection();
                
                // Ensure the failed_login_attempts table exists
                await authConn.query(`
                    CREATE TABLE IF NOT EXISTS failed_login_attempts (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        identifier VARCHAR(100) NOT NULL,
                        identifier_type ENUM('username', 'email', 'ip') NOT NULL,
                        ip_address VARCHAR(45),
                        user_agent TEXT,
                        attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        INDEX idx_identifier (identifier, identifier_type),
                        INDEX idx_ip_address (ip_address),
                        INDEX idx_attempt_time (attempt_time)
                    )
                `);
                
                authConn.end();
                console.log('✅ Security logger service initialized with database tables');
            } else {
                console.log('✅ Security logger service initialized (memory-only mode)');
            }
            
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize security logger service:', error);
            return false;
        }
    }

    /**
     * Shutdown the service
     */
    async shutdown() {
        if (this.bufferFlushInterval) {
            clearInterval(this.bufferFlushInterval);
            this.bufferFlushInterval = null;
        }
        
        // Flush any remaining events
        await this.flushEventBuffer();
        
        console.log('🛑 Security logger shutdown');
    }
}

module.exports = SecurityLogger;
