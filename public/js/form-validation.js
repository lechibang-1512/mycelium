/**
 * Form Validation Utilities
 * Provides centralized form validation and UI enhancement functionality
 */

const formValidator = {
    /**
     * Setup real-time validation for a form
     * @param {HTMLFormElement} form - The form element to validate
     */
    setupRealTimeValidation(form) {
        if (!form) return;
        
        const inputs = form.querySelectorAll('input, select, textarea');
        
        inputs.forEach(input => {
            // Remove invalid styling on focus
            input.addEventListener('focus', () => {
                this.clearFieldErrors(input);
            });
            
            // Validate on blur for better UX
            input.addEventListener('blur', () => {
                this.validateField(input);
            });
            
            // Validate on input for immediate feedback
            input.addEventListener('input', () => {
                // Only validate if the field was previously invalid
                if (input.classList.contains('is-invalid')) {
                    this.validateField(input);
                }
            });
        });
    },
    
    /**
     * Validate a single form field
     * @param {HTMLInputElement} field - The field to validate
     * @returns {boolean} - True if valid, false otherwise
     */
    validateField(field) {
        if (!field) return true;
        
        let isValid = true;
        const value = field.value.trim();
        
        // Check required fields
        if (field.hasAttribute('required') && !value) {
            this.showFieldError(field, 'This field is required');
            isValid = false;
        }
        // Check email format
        else if (field.type === 'email' && value && !this.isValidEmail(value)) {
            this.showFieldError(field, 'Please enter a valid email address');
            isValid = false;
        }
        // Check password strength (basic check)
        else if (field.type === 'password' && value && value.length < 6) {
            this.showFieldError(field, 'Password must be at least 6 characters long');
            isValid = false;
        }
        // Check for minimum length
        else if (field.hasAttribute('minlength') && value && value.length < parseInt(field.getAttribute('minlength'))) {
            this.showFieldError(field, `Minimum length is ${field.getAttribute('minlength')} characters`);
            isValid = false;
        }
        // Check for maximum length
        else if (field.hasAttribute('maxlength') && value && value.length > parseInt(field.getAttribute('maxlength'))) {
            this.showFieldError(field, `Maximum length is ${field.getAttribute('maxlength')} characters`);
            isValid = false;
        }
        // Check for pattern matching
        else if (field.hasAttribute('pattern') && value && !new RegExp(field.getAttribute('pattern')).test(value)) {
            this.showFieldError(field, field.getAttribute('title') || 'Invalid format');
            isValid = false;
        }
        
        if (isValid) {
            this.showFieldSuccess(field);
        }
        
        return isValid;
    },
    
    /**
     * Validate an entire form
     * @param {HTMLFormElement} form - The form to validate
     * @returns {boolean} - True if all fields are valid, false otherwise
     */
    validateForm(form) {
        if (!form) return false;
        
        const inputs = form.querySelectorAll('input, select, textarea');
        let isFormValid = true;
        
        inputs.forEach(input => {
            if (!this.validateField(input)) {
                isFormValid = false;
            }
        });
        
        return isFormValid;
    },
    
    /**
     * Show error state for a field
     * @param {HTMLInputElement} field - The field to show error for
     * @param {string} message - The error message to display
     */
    showFieldError(field, message) {
        field.classList.remove('is-valid');
        field.classList.add('is-invalid');
        
        // Update or create error message
        const feedback = field.parentElement.querySelector('.invalid-feedback');
        if (feedback) {
            feedback.textContent = message;
        }
    },
    
    /**
     * Show success state for a field
     * @param {HTMLInputElement} field - The field to show success for
     */
    showFieldSuccess(field) {
        field.classList.remove('is-invalid');
        field.classList.add('is-valid');
    },
    
    /**
     * Clear error state for a field
     * @param {HTMLInputElement} field - The field to clear errors for
     */
    clearFieldErrors(field) {
        field.classList.remove('is-invalid', 'is-valid');
    },
    
    /**
     * Setup password toggle functionality
     * @param {string} passwordFieldId - ID of the password field
     * @param {string} toggleButtonId - ID of the toggle button
     */
    setupPasswordToggle(passwordFieldId, toggleButtonId) {
        const passwordField = document.getElementById(passwordFieldId);
        const toggleButton = document.getElementById(toggleButtonId);
        const toggleIcon = toggleButton ? toggleButton.querySelector('i') : null;
        
        if (!passwordField || !toggleButton) return;
        
        toggleButton.addEventListener('click', () => {
            if (passwordField.type === 'password') {
                passwordField.type = 'text';
                if (toggleIcon) {
                    toggleIcon.classList.remove('fa-eye');
                    toggleIcon.classList.add('fa-eye-slash');
                }
                toggleButton.setAttribute('aria-label', 'Hide password');
            } else {
                passwordField.type = 'password';
                if (toggleIcon) {
                    toggleIcon.classList.remove('fa-eye-slash');
                    toggleIcon.classList.add('fa-eye');
                }
                toggleButton.setAttribute('aria-label', 'Show password');
            }
        });
    },
    
    /**
     * Validate email format
     * @param {string} email - The email to validate
     * @returns {boolean} - True if valid email format
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },
    
    /**
     * Setup form submission with loading state
     * @param {string} formId - ID of the form
     * @param {string} submitButtonId - ID of the submit button
     * @param {Object} options - Configuration options
     */
    setupFormSubmission(formId, submitButtonId, options = {}) {
        const form = document.getElementById(formId);
        const submitButton = document.getElementById(submitButtonId);
        
        if (!form || !submitButton) return;
        
        const defaultOptions = {
            loadingText: 'Processing...',
            showSpinner: true,
            validateOnSubmit: true
        };
        
        const config = { ...defaultOptions, ...options };
        
        form.addEventListener('submit', (event) => {
            if (config.validateOnSubmit && !this.validateForm(form)) {
                event.preventDefault();
                return false;
            }
            
            // Show loading state
            const originalText = submitButton.textContent;
            submitButton.textContent = config.loadingText;
            submitButton.disabled = true;
            
            if (config.showSpinner) {
                const spinner = submitButton.querySelector('.spinner-border');
                if (spinner) {
                    spinner.classList.remove('d-none');
                }
            }
            
            // Reset button state if form submission fails
            setTimeout(() => {
                if (submitButton.disabled) {
                    submitButton.textContent = originalText;
                    submitButton.disabled = false;
                    if (config.showSpinner) {
                        const spinner = submitButton.querySelector('.spinner-border');
                        if (spinner) {
                            spinner.classList.add('d-none');
                        }
                    }
                }
            }, 10000); // Reset after 10 seconds as fallback
            
            return true;
        });
    },
    
    /**
     * Setup form auto-save functionality
     * @param {string} formId - ID of the form
     * @param {string} storageKey - Key for localStorage
     */
    setupAutoSave(formId, storageKey) {
        const form = document.getElementById(formId);
        if (!form) return;
        
        const inputs = form.querySelectorAll('input, select, textarea');
        
        // Load saved data
        const savedData = localStorage.getItem(storageKey);
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                inputs.forEach(input => {
                    if (data[input.name] && input.type !== 'password') {
                        input.value = data[input.name];
                    }
                });
            } catch (e) {
                console.warn('Failed to load saved form data:', e);
            }
        }
        
        // Save data on input
        inputs.forEach(input => {
            if (input.type !== 'password') {
                input.addEventListener('input', () => {
                    this.saveFormData(form, storageKey);
                });
            }
        });
        
        // Clear saved data on successful submit
        form.addEventListener('submit', () => {
            localStorage.removeItem(storageKey);
        });
    },
    
    /**
     * Save form data to localStorage
     * @param {HTMLFormElement} form - The form to save
     * @param {string} storageKey - Key for localStorage
     */
    saveFormData(form, storageKey) {
        const data = {};
        const inputs = form.querySelectorAll('input, select, textarea');
        
        inputs.forEach(input => {
            if (input.type !== 'password' && input.name) {
                data[input.name] = input.value;
            }
        });
        
        try {
            localStorage.setItem(storageKey, JSON.stringify(data));
        } catch (e) {
            console.warn('Failed to save form data:', e);
        }
    }
};

// Export for use in other modules if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = formValidator;
}
