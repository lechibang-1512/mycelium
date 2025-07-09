/**
 * Session Management Service
 * 
 * Provides advanced session management capabilities including:
 * - Session monitoring and analytics
 * - Automatic session cleanup
 * - Session security auditing
 * - Multi-device session management
 */

const crypto = require('crypto');
const CleanupServiceInterface = require('./interfaces/CleanupServiceInterface');

class SessionManagementService extends CleanupServiceInterface {
    constructor(authPool, convertBigIntToNumber) {
        super(); // Call parent constructor
        this.authPool = authPool;
        this.convertBigIntToNumber = convertBigIntToNumber;
        this.activeSessions = new Map(); // In-memory session tracking
        this.sessionCleanupInterval = null;
        
        // Note: cleanup is now managed by CleanupManager
        // this.initializeSessionCleanup(); // Remove auto-initialization
    }

    /**
     * Initialize the service
     * Implementation of CleanupServiceInterface
     */
    async initialize() {
        try {
            this.startCleanup();
            console.log('✅ Session management service initialized');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize session management service:', error);
            return false;
        }
    }

    /**
     * Start automatic cleanup operations
     * Implementation of CleanupServiceInterface
     */
    startCleanup() {
        if (this.sessionCleanupInterval) {
            clearInterval(this.sessionCleanupInterval);
        }
        
        // Clean up expired sessions every 15 minutes
        this.sessionCleanupInterval = setInterval(() => {
            this.performCleanup();
        }, 15 * 60 * 1000);
        
        console.log('✅ Session cleanup service started');
    }

    /**
     * Stop automatic cleanup operations
     * Implementation of CleanupServiceInterface
     */
    stopCleanup() {
        if (this.sessionCleanupInterval) {
            clearInterval(this.sessionCleanupInterval);
            this.sessionCleanupInterval = null;
            console.log('🛑 Session cleanup service stopped');
        }
    }

    /**
     * Perform manual cleanup operation
     * Implementation of CleanupServiceInterface
     */
    async performCleanup() {
        return this.cleanupExpiredSessions();
    }

    /**
     * Get service status and statistics
     * Implementation of CleanupServiceInterface
     */
    getStatus() {
        const stats = this.getSessionStats();
        return {
            name: 'SessionManagementService',
            isActive: !!this.sessionCleanupInterval,
            activeSessions: stats.totalActiveSessions,
            uniqueUsers: stats.sessionsByUser.size,
            averageSessionDuration: stats.averageSessionDuration
        };
    }

    /**
     * Track active session
     */
    trackSession(sessionId, sessionData) {
        this.activeSessions.set(sessionId, {
            ...sessionData,
            lastAccess: Date.now()
        });
        
        console.log(`📊 Session tracked: ${sessionId.substring(0, 8)}... (Total active: ${this.activeSessions.size})`);
    }

    /**
     * Update session activity
     */
    updateSessionActivity(sessionId) {
        if (this.activeSessions.has(sessionId)) {
            const session = this.activeSessions.get(sessionId);
            session.lastAccess = Date.now();
            this.activeSessions.set(sessionId, session);
        }
    }

    /**
     * Remove session from tracking
     */
    removeSession(sessionId) {
        if (this.activeSessions.has(sessionId)) {
            const session = this.activeSessions.get(sessionId);
            this.activeSessions.delete(sessionId);
            
            console.log(`🗑️  Session removed: ${sessionId.substring(0, 8)}... User: ${session.username}`);
            return session;
        }
        return null;
    }

    /**
     * Clean up expired sessions
     */
    cleanupExpiredSessions() {
        const now = Date.now();
        const sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours
        let cleanedCount = 0;

        for (const [sessionId, sessionData] of this.activeSessions.entries()) {
            // Check if session has expired
            if (sessionData.sessionExpiry && now > sessionData.sessionExpiry) {
                this.activeSessions.delete(sessionId);
                cleanedCount++;
            }
            // Check for inactive sessions (no activity for session timeout period)
            else if (now - sessionData.lastAccess > sessionTimeout) {
                this.activeSessions.delete(sessionId);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            console.log(`🧹 Cleaned up ${cleanedCount} expired sessions. Active sessions: ${this.activeSessions.size}`);
        }

        return {
            cleanedCount,
            remainingCount: this.activeSessions.size
        };
    }

    /**
     * Get session statistics
     */
    getSessionStats() {
        const stats = {
            totalActiveSessions: this.activeSessions.size,
            sessionsByUser: new Map(),
            oldestSession: null,
            newestSession: null,
            averageSessionDuration: 0
        };

        let totalDuration = 0;
        let oldestTime = Date.now();
        let newestTime = 0;

        for (const [sessionId, sessionData] of this.activeSessions.entries()) {
            // Count sessions by user
            const userId = sessionData.userId;
            const userSessionCount = stats.sessionsByUser.get(userId) || 0;
            stats.sessionsByUser.set(userId, userSessionCount + 1);

            // Calculate session age
            const sessionAge = Date.now() - sessionData.sessionStart;
            totalDuration += sessionAge;

            // Track oldest and newest sessions
            if (sessionData.sessionStart < oldestTime) {
                oldestTime = sessionData.sessionStart;
                stats.oldestSession = { sessionId, ...sessionData };
            }

            if (sessionData.sessionStart > newestTime) {
                newestTime = sessionData.sessionStart;
                stats.newestSession = { sessionId, ...sessionData };
            }
        }

        if (this.activeSessions.size > 0) {
            stats.averageSessionDuration = totalDuration / this.activeSessions.size;
        }

        return stats;
    }

    /**
     * Force logout user from all sessions
     */
    forceLogoutUser(userId) {
        let loggedOutSessions = 0;
        
        for (const [sessionId, sessionData] of this.activeSessions.entries()) {
            if (sessionData.userId === userId) {
                this.activeSessions.delete(sessionId);
                loggedOutSessions++;
            }
        }

        console.log(`🚫 Force logged out user ${userId} from ${loggedOutSessions} sessions`);
        return loggedOutSessions;
    }

    /**
     * Get sessions for a specific user
     */
    getUserSessions(userId) {
        const userSessions = [];
        
        for (const [sessionId, sessionData] of this.activeSessions.entries()) {
            if (sessionData.userId === userId) {
                userSessions.push({
                    sessionId: sessionId.substring(0, 8) + '...',
                    sessionStart: new Date(sessionData.sessionStart).toISOString(),
                    lastAccess: new Date(sessionData.lastAccess).toISOString(),
                    ipAddress: sessionData.ipAddress,
                    userAgent: sessionData.userAgent ? sessionData.userAgent.substring(0, 50) + '...' : 'Unknown'
                });
            }
        }

        return userSessions;
    }

    /**
     * Validate session against potential security threats
     */
    validateSessionSecurity(sessionId, currentRequest) {
        const session = this.activeSessions.get(sessionId);
        
        if (!session) {
            return { valid: false, reason: 'Session not found in active sessions' };
        }

        // Check for IP address changes (potential session hijacking)
        const currentIP = currentRequest.ip || currentRequest.connection.remoteAddress;
        if (session.ipAddress !== currentIP) {
            console.log(`⚠️  IP address mismatch for session ${sessionId.substring(0, 8)}...: ${session.ipAddress} -> ${currentIP}`);
            // Note: In some cases, IP changes might be legitimate (mobile networks, etc.)
            // Consider this a warning rather than automatic session termination
        }

        // Check for suspicious activity patterns
        const timeSinceLastAccess = Date.now() - session.lastAccess;
        if (timeSinceLastAccess > 60 * 60 * 1000) { // 1 hour
            return { valid: false, reason: 'Session inactive for too long' };
        }

        return { valid: true };
    }

    /**
     * Generate session activity report
     */
    generateSessionReport() {
        const stats = this.getSessionStats();
        
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalActiveSessions: stats.totalActiveSessions,
                uniqueUsers: stats.sessionsByUser.size,
                averageSessionDurationHours: Math.round(stats.averageSessionDuration / (1000 * 60 * 60) * 100) / 100
            },
            userBreakdown: Array.from(stats.sessionsByUser.entries()).map(([userId, sessionCount]) => ({
                userId,
                activeSessions: sessionCount
            })),
            oldestSession: stats.oldestSession ? {
                userId: stats.oldestSession.userId,
                username: stats.oldestSession.username,
                sessionStart: new Date(stats.oldestSession.sessionStart).toISOString(),
                durationHours: Math.round((Date.now() - stats.oldestSession.sessionStart) / (1000 * 60 * 60) * 100) / 100
            } : null
        };

        return report;
    }

    /**
     * Shutdown session management service
     * Implementation of CleanupServiceInterface
     */
    async shutdown() {
        this.stopCleanup();
        
        console.log(`📊 Final session stats: ${this.activeSessions.size} active sessions cleared`);
        this.activeSessions.clear();
    }
}

module.exports = SessionManagementService;
