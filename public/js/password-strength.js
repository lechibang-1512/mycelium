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
        const result = zxcvbn(password);

        if (this.options.showStrengthBar) {
            this.updateStrengthBar(result.score);
        }

        if (this.options.showSuggestions) {
            this.updateSuggestions(result.feedback.suggestions);
        }
    }

    validatePassword(password) {
        // This method is now simplified as zxcvbn handles the validation
        const result = zxcvbn(password);
        return {
            valid: result.score >= 3,
            errors: result.feedback.suggestions,
            strength: result.score
        };
    }

    calculateStrength(password, errorCount) {
        // This method is now simplified as zxcvbn handles the strength calculation
        return zxcvbn(password).score;
    }

    updateStrengthBar(score) {
        let strength = (score / 4) * 100;
        let color = '#dc3545'; // Red
        if (score >= 4) {
            color = '#28a745'; // Green
        } else if (score >= 3) {
            color = '#ffc107'; // Yellow
        } else if (score >= 2) {
            color = '#fd7e14'; // Orange
        }

        this.strengthBar.style.width = `${strength}%`;
        this.strengthBar.style.backgroundColor = color;
    }

    updateSuggestions(suggestions) {
        if (suggestions.length > 0) {
            this.suggestionsContainer.innerHTML = `
                <small class="text-muted">Suggestions:</small>
                <ul class="list-unstyled">
                    ${suggestions.map(suggestion => `<li><small>${suggestion}</small></li>`).join('')}
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