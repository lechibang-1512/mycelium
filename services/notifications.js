// Universal NotificationManager for both Node.js and browser
class NotificationManager {
    constructor() {
        this.isBootstrapAvailable = false;
        if (typeof window !== 'undefined') {
            this.initBrowser();
        }
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
        if (typeof window === 'undefined') {
            // Server-side: log to console
            if (type === 'error') {
                console.error(`[${type.toUpperCase()}] ${message}`);
            } else {
                console.log(`[${type.toUpperCase()}] ${message}`);
            }
            return null;
        }
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
        document.getElementById('toast-container').insertAdjacentHTML('beforeend', toastHTML);
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
        if (typeof window === 'undefined') {
            // Server-side: log and auto-confirm
            console.log(`[CONFIRM] ${title}: ${message}`);
            if (onConfirm) onConfirm();
            return null;
        }
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
        
        // Basic HTML escaping for server-side
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }
}

module.exports = NotificationManager;
