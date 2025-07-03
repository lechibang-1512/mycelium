/**
 * Enhanced Security Logging Service
 * 
 * Provides comprehensive security event logging and monitoring
 * to help detect and respond to security incidents.
 */

const DatabaseConnectionHelper = require('./DatabaseConnectionHelper');

class SecurityLogger {
    constructor(authPool = null, convertBigIntToNumber = null, securityDbPool = null) {
        this.authPool = authPool;
        this.securityDbPool = securityDbPool || authPool; // Use separate security db pool if provided, otherwise use auth pool
        this.convertBigIntToNumber = convertBigIntToNumber;
        this.eventBuffer = [];
        this.bufferFlushInterval = null;
        this.maxBufferSize = 50; // Reduced from 100 to flush more frequently but with smaller batches
        this.flushIntervalMs = 60000; // Increased from 30 seconds to 60 seconds
        this.dbHelper = new DatabaseConnectionHelper();
        
        // Initialize buffer flushing
        this.initializeBufferFlushing();
    }

    /**
     * Initialize automatic buffer flushing
     */
    initializeBufferFlushing() {
        this.bufferFlushInterval = setInterval(() => {
            this.flushEventBuffer();
        }, this.flushIntervalMs);
        
        console.log('✅ Security logging buffer flushing initialized');
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
            details: JSON.stringify(details.additionalData || {}),
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
            if (!this.securityDbPool) return;

            await this.dbHelper.executeWithConnection(
                this.securityDbPool,
                async (conn) => {
                    // Determine identifier type
                    const identifierType = this.determineIdentifierType(identifier);
                    
                    await conn.query(
                        'INSERT INTO failed_login_attempts (identifier, identifier_type, ip_address, user_agent) VALUES (?, ?, ?, ?)',
                        [identifier, identifierType, ipAddress, userAgent]
                    );
                },
                'trackFailedLoginAttempt',
                15000 // 15 second timeout for this operation
            );
        } catch (error) {
            console.error('Failed to track failed login attempt:', error);
        }
    }

    /**
     * Log session security violation
     */
    async logSessionViolation(sessionId, userId, violationType, oldValue, newValue, ipAddress, userAgent, actionTaken = 'logged') {
        // Note: session_security_violations table doesn't exist in current schema
        // Log as a security event instead
        await this.logSecurityEvent('session_hijack', {
            userId,
            sessionId,
            ipAddress,
            userAgent,
            additionalData: {
                violationType,
                oldValue,
                newValue,
                actionTaken
            }
        });
    }

    /**
     * Check for suspicious login patterns
     */
    async checkSuspiciousActivity(identifier, ipAddress) {
        try {
            if (!this.securityDbPool) return { suspicious: false, error: 'No database connection' };

            return await this.dbHelper.executeWithConnection(
                this.securityDbPool,
                async (conn) => {
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
                    
                    const failureCount = recentFailures[0].count;
                    const ipCount = ipVariations[0].count;
                    
                    return {
                        suspicious: failureCount >= 3 || ipCount >= 5,
                        failureCount,
                        ipCount,
                        riskLevel: this.calculateActivityRiskLevel(failureCount, ipCount)
                    };
                },
                'checkSuspiciousActivity',
                10000 // 10 second timeout
            );
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
            await this.dbHelper.executeWithConnection(
                this.securityDbPool,
                async (conn) => {
                    for (const event of events) {
                        // Validate event_type against allowed enum values
                        const allowedEventTypes = [
                            'login', 'logout', 'failed_login', 'login_success', 
                            'session_hijack', 'token_invalidation', 'password_change', 'account_lockout'
                        ];
                        
                        let eventType = event.event_type;
                        if (typeof eventType === 'object') {
                            eventType = JSON.stringify(eventType);
                        }
                        eventType = String(eventType || '').toLowerCase();
                        
                        // Map common event types to database enum values
                        if (eventType.includes('login') && eventType.includes('fail')) {
                            eventType = 'failed_login';
                        } else if (eventType.includes('login') && eventType.includes('success')) {
                            eventType = 'login_success';
                        } else if (!allowedEventTypes.includes(eventType)) {
                            // Default to 'login' for unknown types
                            eventType = 'login';
                        }
                        
                        // Validate risk_level against allowed enum values
                        const allowedRiskLevels = ['low', 'medium', 'high', 'critical'];
                        let riskLevel = event.risk_level || 'low';
                        if (!allowedRiskLevels.includes(riskLevel)) {
                            riskLevel = 'low';
                        }
                        
                        await conn.query(
                            `INSERT INTO security_events 
                             (event_type, user_id, username, ip_address, user_agent, session_id, details, risk_level) 
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                            [
                                eventType,
                                event.user_id,
                                event.username ? String(event.username).substring(0, 50) : null,
                                event.ip_address ? String(event.ip_address).substring(0, 45) : null,
                                event.user_agent,
                                event.session_id ? String(event.session_id).substring(0, 32) : null,
                                event.details,
                                riskLevel
                            ]
                        );
                    }
                    
                    if (events.length > 0) {
                        console.log(`📊 Flushed ${events.length} security events to database`);
                    }
                },
                'flushEventBuffer',
                15000 // 15 second timeout
            );
        } catch (error) {
            console.error('Failed to flush security events:', error);
            // Put events back in buffer to retry later, but limit to prevent infinite growth
            if (this.eventBuffer.length < this.maxBufferSize * 2) {
                this.eventBuffer.unshift(...events);
            } else {
                console.warn('⚠️ Security event buffer overflow, discarding old events');
            }
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

            return await this.dbHelper.executeWithConnection(
                this.securityDbPool,
                async (conn) => {
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

                    // Get failed login summary from security database
                    const failedLogins = await conn.query(
                        `SELECT DATE(attempt_time) as date, COUNT(*) as attempts,
                                COUNT(DISTINCT identifier) as unique_identifiers
                         FROM failed_login_attempts 
                         WHERE attempt_time >= DATE_SUB(NOW(), INTERVAL ? DAY)
                         GROUP BY DATE(attempt_time)
                         ORDER BY date DESC`,
                        [days]
                    );

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

                    return {
                        eventsSummary: this.convertBigIntToNumber ? eventsSummary.map(this.convertBigIntToNumber) : eventsSummary,
                        failedLogins: this.convertBigIntToNumber ? failedLogins.map(this.convertBigIntToNumber) : failedLogins,
                        riskIPs: this.convertBigIntToNumber ? riskIPs.map(this.convertBigIntToNumber) : riskIPs,
                        generatedAt: new Date().toISOString()
                    };
                },
                'getSecurityDashboard',
                20000 // 20 second timeout for dashboard operations
            );
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
                await this.dbHelper.executeWithConnection(
                    this.securityDbPool,
                    async (conn) => {
                        // Ensure the security_events table exists with correct schema
                        await conn.query(`
                            CREATE TABLE IF NOT EXISTS security_events (
                                id INT AUTO_INCREMENT PRIMARY KEY,
                                event_type ENUM('login', 'logout', 'failed_login', 'login_success', 'session_hijack', 'token_invalidation', 'password_change', 'account_lockout') NOT NULL,
                                user_id INT,
                                username VARCHAR(50),
                                ip_address VARCHAR(45),
                                user_agent TEXT,
                                session_id VARCHAR(32),
                                details LONGTEXT,
                                risk_level ENUM('low', 'medium', 'high', 'critical') DEFAULT 'low',
                                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                INDEX idx_event_type (event_type),
                                INDEX idx_user_id (user_id),
                                INDEX idx_created_at (created_at),
                                INDEX idx_risk_level (risk_level),
                                INDEX idx_ip_address (ip_address)
                            )
                        `);
                        
                        // Ensure the failed_login_attempts table exists in security database
                        await conn.query(`
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
                        
                        // Ensure the invalidated_tokens table exists in security database
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
                        
                        // Ensure the user_token_invalidation table exists in security database
                        await conn.query(`
                            CREATE TABLE IF NOT EXISTS user_token_invalidation (
                                user_id INT PRIMARY KEY,
                                invalidated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                reason VARCHAR(100) DEFAULT 'security_action',
                                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                                INDEX idx_invalidated_at (invalidated_at)
                            )
                        `);
                    },
                    'initialize',
                    30000 // 30 second timeout for initialization
                );
                
                console.log('✅ Security logger service initialized with all security database tables');
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
