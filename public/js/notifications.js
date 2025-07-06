// Client-side NotificationManager for browser usage
class NotificationManager {
    constructor() {
        this.isBootstrapAvailable = false;
        this.initBrowser();
    }

    initBrowser() {
        // Check if Bootstrap is available
        if (typeof bootstrap !== 'undefined') {
            this.isBootstrapAvailable = true;
            this.createToastContainer();
        } else {
            // Wait for Bootstrap to load
            const checkBootstrap = () => {
                if (typeof bootstrap !== 'undefined') {
                    this.isBootstrapAvailable = true;
                    this.createToastContainer();
                } else {
                    setTimeout(checkBootstrap, 100);
                }
            };
            checkBootstrap();
        }
    }

    createToastContainer() {
        if (!document.getElementById('toast-container')) {
            const container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container position-fixed top-0 end-0 p-3';
            container.style.zIndex = '1055';
            document.body.appendChild(container);
        }
    }

    showToast(message, type = 'info', duration = 5000) {
        // Browser: show Bootstrap toast
        if (!this.isBootstrapAvailable) {
            alert(`${type.toUpperCase()}: ${message}`);
            return null;
        }
        
        const toastId = 'toast-' + Date.now();
        const iconMap = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        const colorMap = {
            success: 'text-success',
            error: 'text-danger',
            warning: 'text-warning',
            info: 'text-info'
        };
        
        const toastHTML = `
            <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true" data-bs-delay="${duration}">
                <div class="toast-header">
                    <i class="${iconMap[type]} ${colorMap[type]} me-2"></i>
                    <strong class="me-auto">${this.capitalizeFirst(type)}</strong>
                    <small class="text-muted">now</small>
                    <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
                <div class="toast-body">
                    ${this.sanitizeHTML(message)}
                </div>
            </div>
        `;
        
        const container = document.getElementById('toast-container');
        if (!container) this.createToastContainer();
        container.insertAdjacentHTML('beforeend', toastHTML);
        
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement);
        toast.show();
        
        toastElement.addEventListener('hidden.bs.toast', function() {
            toastElement.remove();
        });
        
        return toast;
    }

    showSuccess(message, duration = 5000) {
        return this.showToast(message, 'success', duration);
    }
    
    showError(message, duration = 7000) {
        return this.showToast(message, 'error', duration);
    }
    
    showWarning(message, duration = 6000) {
        return this.showToast(message, 'warning', duration);
    }
    
    showInfo(message, duration = 5000) {
        return this.showToast(message, 'info', duration);
    }

    showConfirmDialog(title, message, onConfirm, onCancel = null) {
        if (!this.isBootstrapAvailable) {
            const result = confirm(`${title}\n\n${message}`);
            if (result && onConfirm) onConfirm();
            else if (!result && onCancel) onCancel();
            return null;
        }
        
        const modalId = 'confirm-modal-' + Date.now();
        const modalHTML = `
            <div class="modal fade" id="${modalId}" tabindex="-1" aria-labelledby="${modalId}-label" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="${modalId}-label">
                                <i class="fas fa-question-circle text-warning me-2"></i>${title}
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            ${message}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" id="${modalId}-confirm">Confirm</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const modalElement = document.getElementById(modalId);
        const modal = new bootstrap.Modal(modalElement);
        
        document.getElementById(modalId + '-confirm').addEventListener('click', function() {
            modal.hide();
            if (onConfirm) onConfirm();
        });
        
        modalElement.addEventListener('hidden.bs.modal', function() {
            modalElement.remove();
            if (onCancel) onCancel();
        });
        
        modal.show();
        return modal;
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // Simple HTML sanitization with optional DOMPurify fallback
    sanitizeHTML(str) {
        if (typeof str !== 'string') return '';
        
        // Use DOMPurify if available, otherwise fallback to basic escaping
        if (typeof DOMPurify !== 'undefined' && DOMPurify.sanitize) {
            return DOMPurify.sanitize(str);
        }
        
        // Basic HTML escaping
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }

    // Utility method to show notifications from URL parameters
    showFromUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        
        if (urlParams.get('success')) {
            const successType = urlParams.get('success');
            let message = 'Operation completed successfully!';
            
            switch(successType) {
                case 'login':
                    message = 'Welcome! You have been logged in successfully.';
                    break;
                case 'logout':
                    message = 'You have been logged out successfully.';
                    break;
                case 'created':
                    message = 'Item created successfully!';
                    break;
                case 'updated':
                    message = 'Item updated successfully!';
                    break;
                case 'deleted':
                    message = 'Item deleted successfully!';
                    break;
                case 'stock_received':
                    message = 'Stock received successfully!';
                    break;
                case 'stock_sold':
                    message = 'Stock sold successfully!';
                    break;
                case 'filter_applied':
                    message = 'Filters applied successfully!';
                    break;
                case 'user_created':
                    message = 'User created successfully!';
                    break;
                case 'user_updated':
                    message = 'User updated successfully!';
                    break;
                case 'user_deleted':
                    message = 'User deleted successfully!';
                    break;
                case 'profile_updated':
                    message = 'Profile updated successfully!';
                    break;
                default:
                    message = 'Operation completed successfully!';
            }
            this.showSuccess(message);
        }
        
        if (urlParams.get('error')) {
            const errorType = urlParams.get('error');
            const reason = urlParams.get('reason');
            let message = 'An error occurred.';
            
            switch(errorType) {
                case 'csrf_invalid':
                    if (reason === 'token_mismatch') {
                        message = 'Security token expired. The page will refresh automatically.';
                        setTimeout(() => {
                            window.location.reload();
                        }, 3000);
                    } else {
                        message = 'Security token invalid. Please refresh the page and try again.';
                    }
                    break;
                case 'login_failed':
                    message = 'Login failed. Please check your credentials.';
                    break;
                case 'access_denied':
                    message = 'Access denied. Insufficient permissions.';
                    break;
                case 'not_found':
                    message = 'The requested item was not found.';
                    break;
                case 'database_error':
                    message = 'Database error occurred. Please try again.';
                    break;
                default:
                    message = urlParams.get('error');
            }
            this.showError(message, errorType === 'csrf_invalid' ? 8000 : 7000);
        }
        
        if (urlParams.get('warning')) {
            this.showWarning(urlParams.get('warning'));
        }
        
        if (urlParams.get('info')) {
            this.showInfo(urlParams.get('info'));
        }
    }
}

// Create global instance
window.notificationManager = new NotificationManager();

// Auto-show notifications from URL parameters when page loads
document.addEventListener('DOMContentLoaded', function() {
    window.notificationManager.showFromUrlParams();
});

// Backward compatibility - expose methods globally
window.showNotification = function(message, type = 'info', duration = 5000) {
    return window.notificationManager.showToast(message, type, duration);
};

window.showSuccess = function(message, duration = 5000) {
    return window.notificationManager.showSuccess(message, duration);
};

window.showError = function(message, duration = 7000) {
    return window.notificationManager.showError(message, duration);
};

window.showWarning = function(message, duration = 6000) {
    return window.notificationManager.showWarning(message, duration);
};

window.showInfo = function(message, duration = 5000) {
    return window.notificationManager.showInfo(message, duration);
};

window.showConfirm = function(title, message, onConfirm, onCancel = null) {
    return window.notificationManager.showConfirmDialog(title, message, onConfirm, onCancel);
};

// Backward compatibility alias
window.confirmDialog = function(title, message, onConfirm, onCancel = null) {
    return window.notificationManager.showConfirmDialog(title, message, onConfirm, onCancel);
};
