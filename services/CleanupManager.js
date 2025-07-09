/**
 * Cleanup Service Manager
 * 
 * Centralized manager for all cleanup operations.
 * Follows the Single Responsibility Principle and Dependency Inversion Principle.
 */

const CleanupServiceInterface = require('./interfaces/CleanupServiceInterface');

class CleanupManager {
    constructor() {
        this.services = new Map();
        this.isInitialized = false;
        this.globalCleanupInterval = null;
        this.cleanupIntervalMs = 60 * 60 * 1000; // 1 hour
    }

    /**
     * Register a cleanup service
     * @param {string} name - Service name
     * @param {CleanupServiceInterface} service - Service instance
     */
    registerService(name, service) {
        if (!(service instanceof CleanupServiceInterface)) {
            console.warn(`⚠️  Service ${name} does not implement CleanupServiceInterface`);
        }
        
        this.services.set(name, {
            instance: service,
            isActive: false,
            lastCleanup: null,
            errors: []
        });
        
        console.log(`✅ Cleanup service registered: ${name}`);
    }

    /**
     * Initialize all registered services
     */
    async initialize() {
        console.log('🔧 Initializing Cleanup Manager...');
        
        const initPromises = Array.from(this.services.entries()).map(async ([name, serviceInfo]) => {
            try {
                const success = await serviceInfo.instance.initialize();
                serviceInfo.isActive = success;
                
                if (success) {
                    console.log(`✅ Service initialized: ${name}`);
                } else {
                    console.warn(`⚠️  Service failed to initialize: ${name}`);
                }
                
                return { name, success };
            } catch (error) {
                console.error(`❌ Error initializing service ${name}:`, error);
                serviceInfo.errors.push({
                    timestamp: new Date().toISOString(),
                    operation: 'initialize',
                    error: error.message
                });
                return { name, success: false, error };
            }
        });

        const results = await Promise.all(initPromises);
        const successCount = results.filter(r => r.success).length;
        
        this.isInitialized = true;
        console.log(`✅ Cleanup Manager initialized: ${successCount}/${results.length} services active`);
        
        // Start global coordination
        this.startGlobalCleanup();
        
        return results;
    }

    /**
     * Start global cleanup coordination
     */
    startGlobalCleanup() {
        if (this.globalCleanupInterval) {
            clearInterval(this.globalCleanupInterval);
        }

        this.globalCleanupInterval = setInterval(async () => {
            await this.performGlobalCleanup();
        }, this.cleanupIntervalMs);

        console.log('🔄 Global cleanup coordination started');
    }

    /**
     * Perform cleanup on all active services
     */
    async performGlobalCleanup() {
        console.log('🧹 Performing global cleanup...');
        
        const cleanupPromises = Array.from(this.services.entries())
            .filter(([_, serviceInfo]) => serviceInfo.isActive)
            .map(async ([name, serviceInfo]) => {
                try {
                    const result = await serviceInfo.instance.performCleanup();
                    serviceInfo.lastCleanup = new Date().toISOString();
                    
                    console.log(`✅ Cleanup completed for ${name}:`, result);
                    return { name, success: true, result };
                } catch (error) {
                    console.error(`❌ Cleanup failed for ${name}:`, error);
                    serviceInfo.errors.push({
                        timestamp: new Date().toISOString(),
                        operation: 'cleanup',
                        error: error.message
                    });
                    return { name, success: false, error };
                }
            });

        const results = await Promise.all(cleanupPromises);
        const successCount = results.filter(r => r.success).length;
        
        console.log(`🧹 Global cleanup completed: ${successCount}/${results.length} services succeeded`);
        return results;
    }

    /**
     * Get status of all services
     */
    getOverallStatus() {
        const serviceStatuses = {};
        
        for (const [name, serviceInfo] of this.services.entries()) {
            try {
                serviceStatuses[name] = {
                    isActive: serviceInfo.isActive,
                    lastCleanup: serviceInfo.lastCleanup,
                    errorCount: serviceInfo.errors.length,
                    recentErrors: serviceInfo.errors.slice(-3), // Last 3 errors
                    status: serviceInfo.instance.getStatus()
                };
            } catch (error) {
                serviceStatuses[name] = {
                    isActive: false,
                    error: error.message
                };
            }
        }

        return {
            isInitialized: this.isInitialized,
            totalServices: this.services.size,
            activeServices: Array.from(this.services.values()).filter(s => s.isActive).length,
            cleanupInterval: this.cleanupIntervalMs,
            services: serviceStatuses
        };
    }

    /**
     * Shutdown all services gracefully
     */
    async shutdown() {
        console.log('🛑 Shutting down Cleanup Manager...');
        
        // Stop global cleanup
        if (this.globalCleanupInterval) {
            clearInterval(this.globalCleanupInterval);
            this.globalCleanupInterval = null;
        }

        // Shutdown all services
        const shutdownPromises = Array.from(this.services.entries()).map(async ([name, serviceInfo]) => {
            try {
                await serviceInfo.instance.shutdown();
                console.log(`✅ Service shutdown: ${name}`);
                return { name, success: true };
            } catch (error) {
                console.error(`❌ Error shutting down service ${name}:`, error);
                return { name, success: false, error };
            }
        });

        const results = await Promise.all(shutdownPromises);
        const successCount = results.filter(r => r.success).length;
        
        this.services.clear();
        this.isInitialized = false;
        
        console.log(`🛑 Cleanup Manager shutdown: ${successCount}/${results.length} services shut down successfully`);
        return results;
    }

    /**
     * Manually trigger cleanup for a specific service
     */
    async triggerServiceCleanup(serviceName) {
        const serviceInfo = this.services.get(serviceName);
        
        if (!serviceInfo) {
            throw new Error(`Service not found: ${serviceName}`);
        }

        if (!serviceInfo.isActive) {
            throw new Error(`Service not active: ${serviceName}`);
        }

        try {
            const result = await serviceInfo.instance.performCleanup();
            serviceInfo.lastCleanup = new Date().toISOString();
            
            console.log(`✅ Manual cleanup completed for ${serviceName}`);
            return result;
        } catch (error) {
            serviceInfo.errors.push({
                timestamp: new Date().toISOString(),
                operation: 'manual_cleanup',
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Remove a service from management
     */
    async unregisterService(serviceName) {
        const serviceInfo = this.services.get(serviceName);
        
        if (!serviceInfo) {
            return false;
        }

        try {
            await serviceInfo.instance.shutdown();
        } catch (error) {
            console.warn(`Warning during service shutdown: ${serviceName}:`, error);
        }

        this.services.delete(serviceName);
        console.log(`🗑️  Service unregistered: ${serviceName}`);
        return true;
    }
}

module.exports = CleanupManager;
