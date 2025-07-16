/**
 * Password Strength Indicator
 * 
 * Provides real-time feedback on password strength with a visual bar and suggestions.
 */
class PasswordStrengthIndicator {
    constructor(passwordFieldId, indicatorContainerId, options = {}) {
        this.passwordField = document.getElementById(passwordFieldId);
        this.indicatorContainer = document.getElementById(indicatorContainerId);

        if (!this.passwordField || !this.indicatorContainer) {
            console.error('Password field or indicator container not found.');
            return;
        }

        this.options = {
            minLength: 8,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSpecialChars: true,
            showStrengthBar: true,
            showSuggestions: true,
            ...options
        };

        this.init();
    }

    init() {
        this.render();
        this.passwordField.addEventListener('input', () => this.update());
    }

    render() {
        this.indicatorContainer.innerHTML = `
            <div class="password-strength-bar-container" style="display: ${this.options.showStrengthBar ? 'block' : 'none'};">
                <div class="password-strength-bar"></div>
            </div>
            <div class="password-strength-suggestions" style="display: ${this.options.showSuggestions ? 'block' : 'none'};"></div>
        `;
        this.strengthBar = this.indicatorContainer.querySelector('.password-strength-bar');
        this.suggestionsContainer = this.indicatorContainer.querySelector('.password-strength-suggestions');
    }

    update() {
        const password = this.passwordField.value;
        const validation = this.validatePassword(password);

        if (this.options.showStrengthBar) {
            this.updateStrengthBar(validation.strength);
        }

        if (this.options.showSuggestions) {
            this.updateSuggestions(validation.errors);
        }
    }

    validatePassword(password) {
        const result = {
            valid: true,
            errors: [],
            strength: 0
        };

        if (!password) {
            result.valid = false;
            return result;
        }

        // Length
        if (password.length < this.options.minLength) {
            result.valid = false;
            result.errors.push(`At least ${this.options.minLength} characters`);
        }

        // Uppercase
        if (this.options.requireUppercase && !/[A-Z]/.test(password)) {
            result.valid = false;
            result.errors.push('An uppercase letter');
        }

        // Lowercase
        if (this.options.requireLowercase && !/[a-z]/.test(password)) {
            result.valid = false;
            result.errors.push('A lowercase letter');
        }

        // Numbers
        if (this.options.requireNumbers && !/\d/.test(password)) {
            result.valid = false;
            result.errors.push('A number');
        }

        // Special characters
        if (this.options.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            result.valid = false;
            result.errors.push('A special character');
        }

        result.strength = this.calculateStrength(password, result.errors.length);
        return result;
    }

    calculateStrength(password, errorCount) {
        let strength = 100 - (errorCount * 20);

        if (password.length > this.options.minLength) {
            strength += 10;
        }

        // Bonus for complexity
        const uniqueChars = new Set(password).size;
        if (uniqueChars > password.length * 0.7) {
            strength += 10;
        }

        return Math.max(0, Math.min(100, strength));
    }

    updateStrengthBar(strength) {
        let color = '#dc3545'; // Red
        if (strength >= 80) {
            color = '#28a745'; // Green
        } else if (strength >= 50) {
            color = '#ffc107'; // Yellow
        } else if (strength >= 20) {
            color = '#fd7e14'; // Orange
        }

        this.strengthBar.style.width = `${strength}%`;
        this.strengthBar.style.backgroundColor = color;
    }

    updateSuggestions(errors) {
        if (errors.length > 0) {
            this.suggestionsContainer.innerHTML = `
                <small class="text-muted">Password should contain:</small>
                <ul class="list-unstyled">
                    ${errors.map(err => `<li><small>${err}</small></li>`).join('')}
                </ul>
            `;
        } else {
            this.suggestionsContainer.innerHTML = '';
        }
    }
}

// Add some basic styling
const style = document.createElement('style');
style.innerHTML = `
.password-strength-bar-container {
    height: 5px;
    background-color: #e9ecef;
    border-radius: 5px;
    margin-top: 5px;
}
.password-strength-bar {
    height: 100%;
    border-radius: 5px;
    transition: width 0.3s ease-in-out, background-color 0.3s ease-in-out;
}
.password-strength-suggestions {
    margin-top: 5px;
}
`;
document.head.appendChild(style);