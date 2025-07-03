/**
 * Database Helper Utility
 * Provides helper functions for database operations with proper error handling
 */

class DatabaseHelper {
    /**
     * Execute a database operation with automatic connection management
     * @param {Pool} pool - MariaDB connection pool
     * @param {Function} operation - Async function that takes connection as parameter
     * @param {string} operationName - Name for logging purposes
     * @returns {Promise} Operation result
     */
    static async executeWithConnection(pool, operation, operationName = 'database operation') {
        let conn = null;
        try {
            conn = await pool.getConnection();
            const result = await operation(conn);
            return result;
        } catch (error) {
            console.error(`❌ Database error in ${operationName}:`, error.message);
            throw error;
        } finally {
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
     * Execute a transaction with automatic rollback on error
     * @param {Pool} pool - MariaDB connection pool
     * @param {Function} transactionOperation - Async function that takes connection as parameter
     * @param {string} operationName - Name for logging purposes
     * @returns {Promise} Transaction result
     */
    static async executeTransaction(pool, transactionOperation, operationName = 'transaction') {
        let conn = null;
        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();
            
            const result = await transactionOperation(conn);
            
            await conn.commit();
            return result;
        } catch (error) {
            if (conn) {
                try {
                    await conn.rollback();
                } catch (rollbackError) {
                    console.error(`⚠️ Error during rollback for ${operationName}:`, rollbackError.message);
                }
            }
            console.error(`❌ Transaction error in ${operationName}:`, error.message);
            throw error;
        } finally {
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
     * Get basic pool statistics
     * @param {Pool} pool - MariaDB connection pool
     * @returns {Object} Pool statistics
     */
    static getPoolStats(pool) {
        try {
            return {
                active: pool.activeConnections(),
                total: pool.totalConnections(),
                idle: pool.idleConnections(),
                queueSize: pool.taskQueueSize()
            };
        } catch (error) {
            return { error: 'Unable to get stats' };
        }
    }
}

module.exports = DatabaseHelper;
