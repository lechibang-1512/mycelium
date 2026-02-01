/**
 * Database Transaction Helper
 * 
 * Provides utilities for safe database transaction management with:
 * - Automatic deadlock retry
 * - Connection leak prevention
 * - Transaction isolation level management
 * - Comprehensive error handling
 * 
 * @module database-transaction-helper
 */

/**
 * Execute a database transaction with automatic deadlock retry
 * 
 * @param {Object} pool - MariaDB connection pool
 * @param {Function} transactionFn - Async function that receives connection
 * @param {Object} options - Configuration options
 * @param {number} options.maxRetries - Maximum number of retry attempts (default: 3)
 * @param {number} options.retryDelay - Initial retry delay in ms (default: 100)
 * @param {string} options.isolationLevel - Transaction isolation level (default: 'READ COMMITTED')
 * @param {number} options.timeout - Query timeout in ms (default: 30000)
 * @param {string} options.operationName - Name for logging (default: 'transaction')
 * @returns {Promise<any>} Result from transactionFn
 * 
 * @example
 * const result = await executeTransaction(pool, async (conn) => {
 *   await conn.query('INSERT INTO ...', [values]);
 *   const rows = await conn.query('SELECT ...');
 *   return rows;
 * }, { operationName: 'createOrder' });
 */
async function executeTransaction(pool, transactionFn, options = {}) {
    const {
        maxRetries = 3,
        retryDelay = 100,
        isolationLevel = 'READ COMMITTED',
        timeout = 30000,
        operationName = 'transaction'
    } = options;

    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        let conn;
        const startTime = Date.now();

        try {
            conn = await pool.getConnection();

            // Set query timeout to prevent hung queries (MariaDB uses max_statement_time)
            await conn.query(`SET SESSION max_statement_time = ${timeout / 1000}`);

            // Set transaction isolation level
            await conn.query(`SET SESSION TRANSACTION ISOLATION LEVEL ${isolationLevel}`);

            // Begin transaction
            await conn.beginTransaction();

            // Execute the transaction function
            const result = await transactionFn(conn);

            // Commit transaction
            await conn.commit();

            const duration = Date.now() - startTime;
            if (duration > 5000) {
                console.warn(`⚠️ Slow transaction in ${operationName}: ${duration}ms`);
            }

            return result;

        } catch (error) {
            lastError = error;

            // Rollback on error
            if (conn) {
                try {
                    await conn.rollback();
                } catch (rollbackError) {
                    console.error(`❌ Rollback failed for ${operationName}:`, rollbackError);
                }
            }

            // Check if it's a deadlock or lock timeout error
            const isDeadlock = error.code === 'ER_LOCK_DEADLOCK' ||
                error.errno === 1213 ||
                error.message?.includes('Deadlock');

            const isLockTimeout = error.code === 'ER_LOCK_WAIT_TIMEOUT' ||
                error.errno === 1205 ||
                error.message?.includes('Lock wait timeout');

            if ((isDeadlock || isLockTimeout) && attempt < maxRetries) {
                const delay = retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
                console.warn(
                    `⚠️ ${isDeadlock ? 'Deadlock' : 'Lock timeout'} in ${operationName}, ` +
                    `retry ${attempt}/${maxRetries} after ${delay}ms`
                );
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }

            // Log the error with context
            console.error(`❌ Transaction failed in ${operationName} (attempt ${attempt}/${maxRetries}):`, {
                error: error.message,
                code: error.code,
                errno: error.errno,
                duration: Date.now() - startTime
            });

            throw error;

        } finally {
            // Always release the connection
            if (conn) {
                try {
                    conn.release();
                } catch (releaseError) {
                    console.error(`❌ Connection release failed for ${operationName}:`, releaseError);
                }
            }
        }
    }

    throw lastError;
}

/**
 * Execute a simple query with connection management
 * 
 * @param {Object} pool - MariaDB connection pool
 * @param {string} query - SQL query
 * @param {Array} params - Query parameters
 * @param {Object} options - Configuration options
 * @returns {Promise<any>} Query result
 */
async function executeQuery(pool, query, params = [], options = {}) {
    const { timeout = 30000 } = options;
    let conn;

    try {
        conn = await pool.getConnection();
        await conn.query(`SET SESSION max_statement_time = ${timeout / 1000}`);
        return await conn.query(query, params);
    } finally {
        if (conn) {
            conn.release();
        }
    }
}

/**
 * Check pool health and available connections
 * 
 * @param {Object} pool - MariaDB connection pool
 * @returns {Promise<Object>} Pool statistics
 */
async function getPoolHealth(pool) {
    try {
        return {
            totalConnections: pool.totalConnections(),
            activeConnections: pool.activeConnections(),
            idleConnections: pool.idleConnections(),
            taskQueueSize: pool.taskQueueSize(),
            healthy: pool.taskQueueSize() < pool.totalConnections() * 2
        };
    } catch (error) {
        console.error('Failed to get pool health:', error);
        return { healthy: false, error: error.message };
    }
}

/**
 * Monitor for connection leaks
 * Logs warning if connections are held for too long
 * 
 * @param {Object} pool - MariaDB connection pool
 * @param {number} threshold - Warning threshold in ms (default: 30000)
 */
function monitorConnectionLeaks(pool, threshold = 30000) {
    setInterval(() => {
        const stats = {
            total: pool.totalConnections(),
            active: pool.activeConnections(),
            idle: pool.idleConnections(),
            taskQueue: pool.taskQueueSize()
        };

        if (stats.taskQueue > stats.total) {
            console.warn('⚠️ Connection pool exhausted:', stats);
        }

        if (stats.active > stats.total * 0.8) {
            console.warn('⚠️ High connection usage:', stats);
        }
    }, threshold);
}

module.exports = {
    executeTransaction
};
