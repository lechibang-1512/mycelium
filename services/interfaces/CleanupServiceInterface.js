/**
 * Cleanup Service Interface
 * 
 * Defines the contract for services that need periodic cleanup operations.
 * This follows the Interface Segregation Principle by providing a focused interface.
 */

class CleanupServiceInterface {
    /**
     * Initialize the cleanup service
     * @returns {Promise<boolean>} Success status
     */
    async initialize() {
        throw new Error('initialize() method must be implemented');
    }

    /**
     * Start automatic cleanup operations
     */
    startCleanup() {
        throw new Error('startCleanup() method must be implemented');
    }

    /**
     * Stop automatic cleanup operations
     */
    stopCleanup() {
        throw new Error('stopCleanup() method must be implemented');
    }

    /**
     * Perform manual cleanup operation
     * @returns {Promise<Object>} Cleanup result
     */
    async performCleanup() {
        throw new Error('performCleanup() method must be implemented');
    }

    /**
     * Shutdown the service gracefully
     * @returns {Promise<void>}
     */
    async shutdown() {
        throw new Error('shutdown() method must be implemented');
    }

    /**
     * Get service status and statistics
     * @returns {Object} Service status
     */
    getStatus() {
        throw new Error('getStatus() method must be implemented');
    }
}

module.exports = CleanupServiceInterface;
