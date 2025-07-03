/**
 * Enhanced Security Logging Service
 * 
 * Provides comprehensive security event logging and monitoring
 * to help detect and respond to security incidents.
 */

class SecurityLogger {
    constructor(authPool = null, convertBigIntToNumber = null) {
        this.authPool = authPool;
        this.convertBigIntToNumber = convertBigIntToNumber;
        this.eventBuffer = [];
        this.bufferFlushInterval = null;
        this.maxBufferSize = 100;
        this.flushIntervalMs = 30000; // 30 seconds
        
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
        const event = {
            event_type: eventType,
            user_id: details.userId || null,
            username: details.username || null,
            ip_address: details.ipAddress || null,
            user_agent: details.userAgent || null,
            session_id: details.sessionId || null,
            details: JSON.stringify(details.additionalData || {}),
            risk_level: this.calculateRiskLevel(eventType, details),
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
        console.log(`${riskEmoji} Security Event: ${eventType} | User: ${details.username || 'unknown'} | Risk: ${event.risk_level}`);
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
        if (this.eventBuffer.length === 0 || !this.authPool) return;

        try {
            const events = [...this.eventBuffer];
            this.eventBuffer = [];

            const conn = await this.authPool.getConnection();
            
            for (const event of events) {
                await conn.query(
                    `INSERT INTO security_events 
                     (event_type, user_id, username, ip_address, user_agent, session_id, details, risk_level) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        event.event_type,
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
            case 'token_invalidation':
                return details.additionalData?.reason === 'security_violation' ? 'high' : 'low';
            case 'password_change':
                return details.additionalData?.forced ? 'medium' : 'low';
            case 'login':
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
            if (!this.authPool) return null;

            const conn = await this.authPool.getConnection();
            
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

            // Get failed login summary
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
            if (this.authPool) {
                const conn = await this.authPool.getConnection();
                
                // Ensure the security_events table exists
                await conn.query(`
                    CREATE TABLE IF NOT EXISTS security_events (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        event_type ENUM('login', 'logout', 'failed_login', 'session_hijack', 'token_invalidation', 'password_change', 'account_lockout') NOT NULL,
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
                
                // Ensure the failed_login_attempts table exists
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
                
                conn.end();
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
