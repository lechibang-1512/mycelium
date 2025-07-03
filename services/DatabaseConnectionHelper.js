/**
 * Database Connection Helper
 * Provides robust connection handling with proper timeout management and error recovery
 */
class DatabaseConnectionHelper {
    constructor() {
        this.connectionStats = {
            totalConnections: 0,
            successfulConnections: 0,
            timeouts: 0,
            errors: 0
        };
        
        // Log stats every 5 minutes
        this.statsInterval = setInterval(() => {
            this.logConnectionStats();
        }, 5 * 60 * 1000);
    }

    /**
     * Execute a database operation with proper connection handling
     * @param {Pool} pool - MariaDB connection pool
     * @param {Function} operation - Async function that takes connection as parameter
     * @param {string} operationName - Name for logging purposes
     * @param {number} timeout - Timeout in milliseconds (default: 30000)
     * @returns {Promise} Operation result
     */
    async executeWithConnection(pool, operation, operationName = 'database operation', timeout = 30000) {
        this.connectionStats.totalConnections++;
        let conn = null;
        
        try {
            // Add timeout to connection acquisition
            conn = await Promise.race([
                pool.getConnection(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Connection timeout')), timeout)
                )
            ]);
            
            this.connectionStats.successfulConnections++;
            
            // Execute the operation
            const result = await operation(conn);
            
            return result;
            
        } catch (error) {
            if (error.message === 'Connection timeout' || error.code === 'ER_GET_CONNECTION_TIMEOUT') {
                this.connectionStats.timeouts++;
                console.error(`🚨 Database connection timeout for ${operationName}:`, {
                    operation: operationName,
                    timeout: timeout,
                    poolStats: await this.getPoolStats(pool),
                    error: error.message
                });
            } else {
                this.connectionStats.errors++;
                console.error(`❌ Database error in ${operationName}:`, error.message);
            }
            
            throw error;
        } finally {
            // Always ensure connection is released
            if (conn) {
                try {
                    conn.end();
                } catch (releaseError) {
                    console.error(`⚠️ Error releasing connection for ${operationName}:`, releaseError.message);
                }
            }
        }
    }

    /**
     * Execute multiple operations in parallel with connection management
     * @param {Array} operations - Array of { pool, operation, name } objects
     * @param {number} timeout - Timeout per operation
     * @returns {Promise<Array>} Results array
     */
    async executeParallel(operations, timeout = 30000) {
        const promises = operations.map(({ pool, operation, name }) => 
            this.executeWithConnection(pool, operation, name, timeout)
        );
        
        return Promise.all(promises);
    }

    /**
     * Get connection pool statistics
     * @param {Pool} pool - MariaDB pool
     * @returns {Object} Pool statistics
     */
    async getPoolStats(pool) {
        try {
            return {
                activeConnections: pool.activeConnections(),
                totalConnections: pool.totalConnections(),
                idleConnections: pool.idleConnections(),
                taskQueueSize: pool.taskQueueSize()
            };
        } catch (error) {
            return { error: 'Unable to get pool stats' };
        }
    }

    /**
     * Log connection statistics
     */
    logConnectionStats() {
        const { totalConnections, successfulConnections, timeouts, errors } = this.connectionStats;
        const successRate = totalConnections > 0 ? ((successfulConnections / totalConnections) * 100).toFixed(2) : 0;
        
        console.log('📊 Database Connection Statistics:', {
            total: totalConnections,
            successful: successfulConnections,
            timeouts: timeouts,
            errors: errors,
            successRate: `${successRate}%`
        });
        
        // Alert if success rate is low
        if (totalConnections > 10 && successRate < 90) {
            console.warn(`⚠️ Low database connection success rate: ${successRate}%`);
        }
    }

    /**
     * Get current statistics
     */
    getStats() {
        return { ...this.connectionStats };
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.connectionStats = {
            totalConnections: 0,
            successfulConnections: 0,
            timeouts: 0,
            errors: 0
        };
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
        }
    }
}

module.exports = DatabaseConnectionHelper;
