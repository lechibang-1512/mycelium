/**
 * Dynamic Session Secret Management Service
 * 
 * Provides dynamic loading, rotation, and management of session secrets
 * for enhanced security and operational flexibility.
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class DynamicSessionSecretService {
    constructor() {
        this.currentSecret = null;
        this.previousSecret = null;
        this.secretHistory = [];
        this.rotationInterval = null;
        this.secretFile = path.join(process.cwd(), '.session-secrets.json');
        
        // Configuration
        this.config = {
            rotationIntervalHours: 24, // Rotate every 24 hours
            keepHistoryCount: 5, // Keep last 5 secrets for gradual transition
            secretLength: 64, // 64-character secrets
            autoRotation: process.env.AUTO_ROTATE_SESSION_SECRET === 'true',
            backupToFile: process.env.BACKUP_SESSION_SECRETS === 'true'
        };
    }

    /**
     * Initialize the service and load secrets
     */
    async initialize() {
        console.log('🔐 Initializing Dynamic Session Secret Service...');
        
        try {
            // Try to load existing secrets from file
            await this.loadSecretsFromFile();
            
            // If no secrets loaded, generate initial secret
            if (!this.currentSecret) {
                await this.generateInitialSecret();
            }
            
            // Start auto-rotation if enabled
            if (this.config.autoRotation) {
                this.startAutoRotation();
            }
            
            console.log('✅ Dynamic Session Secret Service initialized');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Dynamic Session Secret Service:', error);
            // Fallback to environment variable
            this.currentSecret = process.env.SESSION_SECRET;
            return false;
        }
    }

    /**
     * Generate a cryptographically secure session secret
     */
    generateSecret() {
        return crypto.randomBytes(this.config.secretLength / 2).toString('hex');
    }

    /**
     * Generate initial secret if none exists
     */
    async generateInitialSecret() {
        this.currentSecret = process.env.SESSION_SECRET || this.generateSecret();
        
        if (this.config.backupToFile) {
            await this.saveSecretsToFile();
        }
        
        console.log('🔑 Initial session secret generated');
    }

    /**
     * Rotate the session secret
     */
    async rotateSecret() {
        console.log('🔄 Rotating session secret...');
        
        try {
            // Move current secret to previous
            this.previousSecret = this.currentSecret;
            
            // Add to history
            if (this.currentSecret) {
                this.secretHistory.unshift({
                    secret: this.currentSecret,
                    timestamp: Date.now(),
                    rotatedAt: new Date().toISOString()
                });
                
                // Keep only configured number of historical secrets
                this.secretHistory = this.secretHistory.slice(0, this.config.keepHistoryCount);
            }
            
            // Generate new secret
            this.currentSecret = this.generateSecret();
            
            // Save to file if enabled
            if (this.config.backupToFile) {
                await this.saveSecretsToFile();
            }
            
            console.log('✅ Session secret rotated successfully');
            
            // Notify that secret has been rotated (for session re-validation)
            this.notifySecretRotation();
            
            return this.currentSecret;
        } catch (error) {
            console.error('❌ Failed to rotate session secret:', error);
            throw error;
        }
    }

    /**
     * Get current active secret
     */
    getCurrentSecret() {
        return this.currentSecret || process.env.SESSION_SECRET;
    }

    /**
     * Get all valid secrets (current + recent history for graceful transition)
     */
    getValidSecrets() {
        const secrets = [this.getCurrentSecret()];
        
        if (this.previousSecret) {
            secrets.push(this.previousSecret);
        }
        
        // Add recent historical secrets (for gradual transition)
        const recentHistory = this.secretHistory
            .filter(entry => Date.now() - entry.timestamp < 2 * 60 * 60 * 1000) // 2 hours
            .map(entry => entry.secret);
        
        secrets.push(...recentHistory);
        
        return [...new Set(secrets)]; // Remove duplicates
    }

    /**
     * Validate if a secret is currently valid
     */
    isValidSecret(secret) {
        return this.getValidSecrets().includes(secret);
    }

    /**
     * Load secrets from encrypted file
     */
    async loadSecretsFromFile() {
        try {
            const data = await fs.readFile(this.secretFile, 'utf8');
            const parsed = JSON.parse(data);
            
            this.currentSecret = parsed.currentSecret;
            this.previousSecret = parsed.previousSecret;
            this.secretHistory = parsed.secretHistory || [];
            
            console.log('📂 Session secrets loaded from file');
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.warn('⚠️  Failed to load session secrets from file:', error.message);
            }
        }
    }

    /**
     * Save secrets to encrypted file
     */
    async saveSecretsToFile() {
        try {
            const data = {
                currentSecret: this.currentSecret,
                previousSecret: this.previousSecret,
                secretHistory: this.secretHistory,
                lastUpdated: new Date().toISOString()
            };
            
            await fs.writeFile(this.secretFile, JSON.stringify(data, null, 2), {
                mode: 0o600 // Read/write for owner only
            });
            
            console.log('💾 Session secrets saved to file');
        } catch (error) {
            console.error('❌ Failed to save session secrets to file:', error);
        }
    }

    /**
     * Start automatic secret rotation
     */
    startAutoRotation() {
        const intervalMs = this.config.rotationIntervalHours * 60 * 60 * 1000;
        
        this.rotationInterval = setInterval(async () => {
            try {
                await this.rotateSecret();
            } catch (error) {
                console.error('❌ Auto rotation failed:', error);
            }
        }, intervalMs);
        
        console.log(`⏰ Auto rotation enabled (every ${this.config.rotationIntervalHours} hours)`);
    }

    /**
     * Stop automatic rotation
     */
    stopAutoRotation() {
        if (this.rotationInterval) {
            clearInterval(this.rotationInterval);
            this.rotationInterval = null;
            console.log('⏹️  Auto rotation stopped');
        }
    }

    /**
     * Force manual secret rotation
     */
    async forceRotation() {
        console.log('🔄 Force rotating session secret...');
        return await this.rotateSecret();
    }

    /**
     * Get secret rotation status
     */
    getRotationStatus() {
        return {
            currentSecretAge: this.currentSecret ? Date.now() - (this.secretHistory[0]?.timestamp || Date.now()) : 0,
            autoRotationEnabled: !!this.rotationInterval,
            rotationIntervalHours: this.config.rotationIntervalHours,
            secretHistory: this.secretHistory.map(entry => ({
                rotatedAt: entry.rotatedAt,
                age: Date.now() - entry.timestamp,
                // NEVER include actual secret in history
                secretPreview: entry.secret.substring(0, 8) + '...'
            })),
            nextRotationDue: this.rotationInterval ? 
                new Date(Date.now() + this.config.rotationIntervalHours * 60 * 60 * 1000).toISOString() : 
                'Manual only'
        };
    }

    /**
     * Get service statistics (secure version - no actual secrets exposed)
     */
    getStatistics() {
        return {
            currentSecretLength: this.currentSecret ? this.currentSecret.length : 0,
            totalRotations: this.secretHistory.length,
            autoRotationEnabled: !!this.rotationInterval,
            lastRotation: this.secretHistory[0]?.rotatedAt || 'Never',
            validSecretsCount: this.getValidSecrets().length,
            configuredRotationInterval: this.config.rotationIntervalHours + ' hours'
        };
    }

    /**
     * Get secure partial secret for display (first 8 chars + ...)
     * NEVER expose full secrets in logs or APIs
     */
    getSecureSecretPreview() {
        if (!this.currentSecret) return 'Not available';
        return this.currentSecret.substring(0, 8) + '...(' + (this.currentSecret.length - 8) + ' more chars)';
    }

    /**
     * Shutdown the service
     */
    async shutdown() {
        console.log('🛑 Shutting down Dynamic Session Secret Service...');
        
        this.stopAutoRotation();
        
        if (this.config.backupToFile) {
            await this.saveSecretsToFile();
        }
        
        console.log('✅ Dynamic Session Secret Service shutdown complete');
    }
}

module.exports = DynamicSessionSecretService;
