/**
 * Password Security Validation Service
 * 
 * Provides comprehensive password validation, strength checking,
 * and security policy enforcement.
 */

const crypto = require('crypto');
const zxcvbn = require('zxcvbn');

class PasswordValidator {
    constructor() {
        this.minLength = 8;
        this.maxLength = 128;
        this.requireUppercase = true;
        this.requireLowercase = true;
        this.requireNumbers = true;
        this.requireSpecialChars = true;
        this.maxConsecutiveChars = 3;
        this.commonPasswords = [
            'password', 'password123', '123456', '12345678', 'qwerty',
            'abc123', 'password1', 'admin', 'administrator', 'root',
            'guest', 'test', 'user', 'demo', '111111', '000000',
            'welcome', 'login', 'pass', 'secret', 'mycelium'
        ];
    }

    /**
     * Validate password against security policies
     * @param {string} password - The password to validate
     * @param {string} username - The username (to check for similarity)
     * @param {string} email - The email (to check for similarity)
     * @returns {Object} Validation result with success status and details
     */
    validatePassword(password, username = '', email = '') {
        const result = {
            valid: true,
            errors: [],
            warnings: [],
            strength: 0,
            strengthText: 'Weak'
        };

        // Check if password exists
        if (!password) {
            result.valid = false;
            result.errors.push('Password is required');
            return result;
        }

        const zxcvbnResult = zxcvbn(password, [username, email]);

        // Length validation
        if (password.length < this.minLength) {
            result.valid = false;
            result.errors.push(`Password must be at least ${this.minLength} characters long`);
        }

        if (password.length > this.maxLength) {
            result.valid = false;
            result.errors.push(`Password must not exceed ${this.maxLength} characters`);
        }

        // Character requirements
        if (this.requireUppercase && !/[A-Z]/.test(password)) {
            result.valid = false;
            result.errors.push('Password must contain at least one uppercase letter');
        }

        if (this.requireLowercase && !/[a-z]/.test(password)) {
            result.valid = false;
            result.errors.push('Password must contain at least one lowercase letter');
        }

        if (this.requireNumbers && !/\d/.test(password)) {
            result.valid = false;
            result.errors.push('Password must contain at least one number');
        }

        if (this.requireSpecialChars && !/[-!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/.test(password)) {
            result.valid = false;
            result.errors.push('Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)');
        }

        // Check for consecutive characters
        if (this.hasConsecutiveChars(password, this.maxConsecutiveChars)) {
            result.warnings.push(`Avoid using more than ${this.maxConsecutiveChars} consecutive identical characters`);
        }

        // Check against common passwords
        if (this.isCommonPassword(password)) {
            result.valid = false;
            result.errors.push('This password is too common. Please choose a more unique password');
        }

        // Add zxcvbn feedback
        if (zxcvbnResult.feedback.warning) {
            result.warnings.push(zxcvbnResult.feedback.warning);
        }
        result.errors.push(...zxcvbnResult.feedback.warnings);

        // Calculate password strength
        result.strength = zxcvbnResult.score;
        result.strengthText = this.getStrengthText(zxcvbnResult.score);

        // Add strength warnings
        if (zxcvbnResult.score < 3) {
            result.warnings.push('Consider using a stronger password for better security');
        }

        return result;
    }

    /**
     * Check for consecutive characters
     */
    hasConsecutiveChars(password, maxConsecutive) {
        let consecutive = 1;
        for (let i = 1; i < password.length; i++) {
            if (password[i] === password[i - 1]) {
                consecutive++;
                if (consecutive > maxConsecutive) {
                    return true;
                }
            } else {
                consecutive = 1;
            }
        }
        return false;
    }

    /**
     * Check if password is in common passwords list
     */
    isCommonPassword(password) {
        const lowerPassword = password.toLowerCase();
        return this.commonPasswords.includes(lowerPassword);
    }

    /**
     * Check if password is similar to username or email
     */
    isSimilarToIdentifier(password, identifier) {
        if (!identifier) return false;
        
        const lowerPassword = password.toLowerCase();
        const lowerIdentifier = identifier.toLowerCase();
        
        // Direct match
        if (lowerPassword === lowerIdentifier) return true;
        
        // Password contains identifier or vice versa
        if (lowerPassword.includes(lowerIdentifier) || lowerIdentifier.includes(lowerPassword)) {
            return true;
        }
        
        // Reverse check
        if (lowerPassword === lowerIdentifier.split('').reverse().join('')) return true;
        
        return false;
    }

    /**
     * Check for keyboard patterns
     */
    hasKeyboardPattern(password) {
        const patterns = [
            'qwerty', 'qwertyuiop', 'asdf', 'asdfghjkl', 'zxcv', 'zxcvbnm',
            '123456', '1234567890', 'abcdef', 'password', 'admin'
        ];
        
        const lowerPassword = password.toLowerCase();
        return patterns.some(pattern => lowerPassword.includes(pattern));
    }

    /**
     * Calculate password strength score (0-100)
     */
    calculateStrength(password) {
        return zxcvbn(password).score;
    }

    /**
     * Get strength text description
     */
    getStrengthText(score) {
        if (score >= 4) return 'Very Strong';
        if (score >= 3) return 'Strong';
        if (score >= 2) return 'Moderate';
        if (score >= 1) return 'Weak';
        return 'Very Weak';
    }

    /**
     * Generate a secure password suggestion
     */
    generateSecurePassword(length = 12) {
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const lowercase = 'abcdefghijklmnopqrstuvwxyz';
        const numbers = '0123456789';
        const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
        
        let password = '';
        
        // Ensure at least one character from each category
        password += uppercase[this.getSecureRandomIndex(uppercase.length)];
        password += lowercase[this.getSecureRandomIndex(lowercase.length)];
        password += numbers[this.getSecureRandomIndex(numbers.length)];
        password += symbols[this.getSecureRandomIndex(symbols.length)];
        
        // Fill the rest randomly
        const allChars = uppercase + lowercase + numbers + symbols;
        for (let i = password.length; i < length; i++) {
            password += allChars[this.getSecureRandomIndex(allChars.length)];
        }
        
        // Shuffle the password using Fisher-Yates algorithm with secure random
        const chars = password.split('');
        for (let i = chars.length - 1; i > 0; i--) {
            const j = this.getSecureRandomIndex(i + 1);
            [chars[i], chars[j]] = [chars[j], chars[i]];
        }
        return chars.join('');
    }

    /**
     * Validate password change request
     */
    validatePasswordChange(currentPassword, newPassword, confirmPassword, username = '', email = '') {
        const result = {
            valid: true,
            errors: [],
            warnings: []
        };

        // Check if all required fields are provided
        if (!currentPassword) {
            result.valid = false;
            result.errors.push('Current password is required');
        }

        if (!newPassword) {
            result.valid = false;
            result.errors.push('New password is required');
        }

        if (!confirmPassword) {
            result.valid = false;
            result.errors.push('Password confirmation is required');
        }

        // Check if new passwords match
        if (newPassword !== confirmPassword) {
            result.valid = false;
            result.errors.push('New password and confirmation do not match');
        }

        // Check if new password is different from current
        if (currentPassword === newPassword) {
            result.valid = false;
            result.errors.push('New password must be different from current password');
        }

        // Validate new password strength
        if (newPassword) {
            const passwordValidation = this.validatePassword(newPassword, username, email);
            if (!passwordValidation.valid) {
                result.valid = false;
                result.errors.push(...passwordValidation.errors);
            }
            result.warnings.push(...passwordValidation.warnings);
        }

        return result;
    }

    /**
     * Generate a cryptographically secure random index
     * @param {number} max - Maximum value (exclusive)
     * @returns {number} Secure random index
     */
    getSecureRandomIndex(max) {
        const maxValidRange = Math.floor(2**32 / max) * max;
        let randomInt;
        do {
            const buffer = crypto.randomBytes(4);
            randomInt = buffer.readUInt32BE(0);
        } while (randomInt >= maxValidRange);
        return randomInt % max;
    }
}

module.exports = PasswordValidator;
