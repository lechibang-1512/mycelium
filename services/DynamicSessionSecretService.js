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
        
        // File encryption key used to protect secrets at rest when backupToFile is enabled.
        // This should be a 32-byte key provided via environment variable and kept out of source control.
        this.fileEncryptionKey = process.env.SESSION_SECRETS_FILE_KEY || null;

        // If backups to file are enabled but no encryption key is supplied, disable backups and warn.
        if (this.config.backupToFile && !this.fileEncryptionKey) {
            console.warn('⚠️  BACKUP_SESSION_SECRETS enabled but SESSION_SECRETS_FILE_KEY is not set. Disabling file backups to avoid storing plaintext secrets.');
            this.config.backupToFile = false;
        }
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
            // Emit an application-level event so other parts of the app (middleware)
            // can react to secret rotation. We call a helper which is defined below.
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
            const raw = await fs.readFile(this.secretFile, 'utf8');
            const parsed = JSON.parse(raw);

            // If the file looks encrypted (has ciphertext/iv/authTag), decrypt it first
            if (parsed.ciphertext && parsed.iv && parsed.authTag) {
                try {
                    const plaintext = this._decryptFromFile(parsed);
                    const payload = JSON.parse(plaintext);
                    this.currentSecret = payload.currentSecret;
                    this.previousSecret = payload.previousSecret;
                    this.secretHistory = payload.secretHistory || [];
                    console.log('📂 Encrypted session secrets loaded from file');
                } catch (err) {
                    console.warn('⚠️  Failed to decrypt session secrets file; it may be corrupted or the key is invalid:', err.message);
                }
            } else {
                // Backwards compatibility: if file contains plaintext JSON, load it but warn
                console.warn('⚠️  Loading session secrets from plaintext file. Consider enabling file encryption via SESSION_SECRETS_FILE_KEY.');
                this.currentSecret = parsed.currentSecret;
                this.previousSecret = parsed.previousSecret;
                this.secretHistory = parsed.secretHistory || [];
            }
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

            if (this.config.backupToFile) {
                // Encrypt and write file
                const filePayload = this._encryptForFile(JSON.stringify(data));
                await fs.writeFile(this.secretFile, JSON.stringify(filePayload, null, 2), { mode: 0o600 });
                console.log('💾 Encrypted session secrets saved to file');
            } else {
                // Should rarely happen - keep behavior safe: do not write plaintext
                console.warn('⚠️  File backups disabled; skipping saving session secrets to disk to avoid plaintext at rest.');
            }
        } catch (error) {
            console.error('❌ Failed to save session secrets to file:', error);
        }
    }

    /**
     * Encrypt plaintext using AES-256-GCM and return an object suitable for writing to disk.
     */
    _encryptForFile(plaintext) {
        if (!this.fileEncryptionKey) throw new Error('File encryption key not configured');

        // Derive a 32-byte key from the provided passphrase (allow short env values)
        const key = crypto.scryptSync(this.fileEncryptionKey, 'session-file-salt', 32);
        const iv = crypto.randomBytes(12); // 96-bit IV for GCM
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
        const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
        const authTag = cipher.getAuthTag();

        return {
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex'),
            ciphertext: ciphertext.toString('hex')
        };
    }

    /**
     * Decrypt an object read from file (expects iv, authTag, ciphertext) and return plaintext string.
     */
    _decryptFromFile(parsed) {
        if (!this.fileEncryptionKey) throw new Error('File encryption key not configured');

        const key = crypto.scryptSync(this.fileEncryptionKey, 'session-file-salt', 32);
        const iv = Buffer.from(parsed.iv, 'hex');
        const authTag = Buffer.from(parsed.authTag, 'hex');
        const ciphertext = Buffer.from(parsed.ciphertext, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);
        const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        return plaintext.toString('utf8');
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
            // If we have historical timestamps use the most recent entry for a rough age.
            // If unavailable, return 0 to indicate unknown/just-created.
            currentSecretAge: this.secretHistory && this.secretHistory.length > 0 ? Date.now() - this.secretHistory[0].timestamp : 0,
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
     * Notify other parts of the process that a secret rotation occurred.
     * Uses a process-level event so consumers outside this module (for example
     * middleware running in a different module) can listen and react.
     */
    notifySecretRotation() {
        try {
            // Provide a minimal payload (no secrets) - listeners should fetch secrets
            // from the service instance rather than relying on event payloads.
            process.emit('sessionSecretRotated');
        } catch (err) {
            // Do not throw - rotation already succeeded; just log the issue.
            console.warn('⚠️  Failed to emit sessionSecretRotated event:', err && err.message);
        }
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
