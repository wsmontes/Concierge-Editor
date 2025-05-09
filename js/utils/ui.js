/**
 * UI Utility Module - Handles UI interactions, notifications, and theme switching
 * Dependencies: None, uses CSS variables for theming
 */

const UIModule = (function() {
    /**
     * Initialize UI module
     */
    function init() {
        initThemeToggle();
        initToastContainer();
        initTooltips();
        applySavedTheme();
        initAccessibilityFeatures();
    }
    
    /**
     * Initialize theme toggle functionality
     */
    function initThemeToggle() {
        const themeToggle = document.getElementById('theme-toggle');
        
        if (themeToggle) {
            themeToggle.addEventListener('click', function() {
                document.documentElement.classList.toggle('dark-theme');
                const isDarkMode = document.documentElement.classList.contains('dark-theme');
                localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
                
                // Update icon
                const themeIcon = this.querySelector('i') || this.querySelector('span');
                if (themeIcon) {
                    if (themeIcon.classList.contains('material-icons')) {
                        themeIcon.textContent = isDarkMode ? 'light_mode' : 'dark_mode';
                    } else {
                        themeIcon.className = isDarkMode ? 'fas fa-sun' : 'fas fa-moon';
                    }
                }
            });
        }
    }
    
    /**
     * Initialize toast container if it doesn't exist
     */
    function initToastContainer() {
        if (!document.getElementById('toast-container')) {
            const toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            document.body.appendChild(toastContainer);
        }
    }
    
    /**
     * Initialize tooltips on elements with data-tooltip attribute
     */
    function initTooltips() {
        const tooltipElements = document.querySelectorAll('[data-tooltip]');
        
        tooltipElements.forEach(element => {
            element.addEventListener('mouseenter', function(e) {
                const tooltipText = this.getAttribute('data-tooltip');
                if (!tooltipText) return;
                
                const tooltip = document.createElement('div');
                tooltip.className = 'tooltip';
                tooltip.textContent = tooltipText;
                
                document.body.appendChild(tooltip);
                
                const rect = this.getBoundingClientRect();
                const tooltipRect = tooltip.getBoundingClientRect();
                
                tooltip.style.top = (rect.top - tooltipRect.height - 10) + 'px';
                tooltip.style.left = (rect.left + rect.width / 2 - tooltipRect.width / 2) + 'px';
                
                // Handle tooltip going off-screen
                const tooltipLeft = parseInt(tooltip.style.left);
                if (tooltipLeft < 0) {
                    tooltip.style.left = '5px';
                } else if (tooltipLeft + tooltipRect.width > window.innerWidth) {
                    tooltip.style.left = (window.innerWidth - tooltipRect.width - 5) + 'px';
                }
                
                // Add to element for easy removal
                this.tooltip = tooltip;
            });
            
            element.addEventListener('mouseleave', function() {
                if (this.tooltip && this.tooltip.parentNode) {
                    this.tooltip.parentNode.removeChild(this.tooltip);
                    this.tooltip = null;
                }
            });
        });
    }
    
    /**
     * Apply saved theme from localStorage
     */
    function applySavedTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark-theme');
            
            // Update theme toggle icon if it exists
            const themeToggle = document.getElementById('theme-toggle');
            if (themeToggle) {
                const themeIcon = themeToggle.querySelector('i') || themeToggle.querySelector('span');
                if (themeIcon) {
                    if (themeIcon.classList.contains('material-icons')) {
                        themeIcon.textContent = 'light_mode';
                    } else {
                        themeIcon.className = 'fas fa-sun';
                    }
                }
            }
        }
    }
    
    /**
     * Initialize accessibility features
     */
    function initAccessibilityFeatures() {
        // Show focus outlines only when using keyboard navigation
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Tab') {
                document.body.classList.add('keyboard-navigation');
            }
        });
        
        document.addEventListener('mousedown', function() {
            document.body.classList.remove('keyboard-navigation');
        });
        
        // Add skip to content link for screen readers
        const skipLink = document.createElement('a');
        skipLink.href = '#main-content';
        skipLink.className = 'skip-link';
        skipLink.textContent = 'Skip to content';
        document.body.insertBefore(skipLink, document.body.firstChild);
    }
    
    /**
     * Show a toast notification
     * @param {string} message - The message to display
     * @param {string} type - The type of toast (success, error, warning, info)
     * @param {number} duration - How long to show the toast in ms (default: 3000)
     */
    function showToast(message, type = 'success', duration = 3000) {
        console.log(`Toast (${type}): ${message}`); // Debug log
        
        // Check if NotificationSystem exists
        if (window.NotificationSystem) {
            window.NotificationSystem.showNotification({
                type: type,
                message: message,
                duration: duration
            });
            return;
        }
        
        // Create toast container if it doesn't exist
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            document.body.appendChild(toastContainer);
        }
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        // Get icon based on type
        let icon;
        switch (type) {
            case 'success':
                icon = 'check_circle';
                break;
            case 'error':
                icon = 'error';
                break;
            case 'warning':
                icon = 'warning';
                break;
            case 'info':
                icon = 'info';
                break;
            default:
                icon = 'info';
        }
        
        // Create toast content
        toast.innerHTML = `
            <div class="toast-content">
                <i class="material-icons">${icon}</i>
                <span class="toast-message">${message}</span>
            </div>
            <button class="toast-close">
                <i class="material-icons">close</i>
            </button>
        `;
        
        // Add to container
        toastContainer.appendChild(toast);
        
        // Add animation class after a small delay for transition effect
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Add close button functionality
        const closeButton = toast.querySelector('.toast-close');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                removeToast(toast);
            });
        }
        
        // Auto-remove after duration
        setTimeout(() => {
            removeToast(toast);
        }, duration);
    }
    
    /**
     * Remove a toast element with animation
     * @param {HTMLElement} toast - The toast element to remove
     */
    function removeToast(toast) {
        toast.classList.remove('show');
        toast.classList.add('hiding');
        
        // Remove after animation completes
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }
    
    /**
     * Show a confirmation dialog
     * @param {Object} options - Dialog configuration options
     * @param {string} options.title - Dialog title
     * @param {string} options.message - Dialog message
     * @param {string} options.confirmText - Text for confirm button (default: 'Confirm')
     * @param {string} options.cancelText - Text for cancel button (default: 'Cancel')
     * @param {string} options.confirmClass - CSS class for confirm button
     * @param {Function} options.onConfirm - Callback when confirmed
     * @param {Function} options.onCancel - Callback when cancelled
     */
    function showConfirmDialog(options) {
        console.log('Showing confirm dialog:', options); // Debug log
        
        // Default options
        const defaultOptions = {
            title: 'Confirm Action',
            message: 'Are you sure you want to proceed?',
            confirmText: 'Confirm',
            cancelText: 'Cancel',
            confirmClass: 'btn-primary',
            onConfirm: () => {},
            onCancel: () => {}
        };
        
        // Merge default options with provided options
        const dialogOptions = { ...defaultOptions, ...options };
        
        // Create dialog container if it doesn't exist
        let dialogContainer = document.getElementById('dialog-container');
        if (!dialogContainer) {
            dialogContainer = document.createElement('div');
            dialogContainer.id = 'dialog-container';
            document.body.appendChild(dialogContainer);
        }
        
        // Create dialog element
        const dialog = document.createElement('div');
        dialog.className = 'confirm-dialog';
        dialog.innerHTML = `
            <div class="dialog-content">
                <div class="dialog-header">
                    <h3>${dialogOptions.title}</h3>
                </div>
                <div class="dialog-body">
                    <p>${dialogOptions.message}</p>
                </div>
                <div class="dialog-footer">
                    <button class="btn btn-secondary btn-cancel">${dialogOptions.cancelText}</button>
                    <button class="btn ${dialogOptions.confirmClass}">${dialogOptions.confirmText}</button>
                </div>
            </div>
        `;
        
        // Add to container
        dialogContainer.innerHTML = '';
        dialogContainer.appendChild(dialog);
        dialogContainer.classList.add('active');
        
        // Handle confirm button click
        const confirmButton = dialog.querySelector(`.btn.${dialogOptions.confirmClass}`);
        if (confirmButton) {
            confirmButton.addEventListener('click', () => {
                dialogOptions.onConfirm();
                closeDialog(dialogContainer);
            });
        }
        
        // Handle cancel button click
        const cancelButton = dialog.querySelector('.btn-cancel');
        if (cancelButton) {
            cancelButton.addEventListener('click', () => {
                dialogOptions.onCancel();
                closeDialog(dialogContainer);
            });
        }
        
        // Handle click outside to cancel
        dialogContainer.addEventListener('click', (e) => {
            if (e.target === dialogContainer) {
                dialogOptions.onCancel();
                closeDialog(dialogContainer);
            }
        });
        
        // Add escape key to cancel
        function handleKeyPress(e) {
            if (e.key === 'Escape') {
                dialogOptions.onCancel();
                closeDialog(dialogContainer);
                document.removeEventListener('keydown', handleKeyPress);
            }
        }
        
        document.addEventListener('keydown', handleKeyPress);
    }
    
    /**
     * Close and remove a dialog
     * @param {HTMLElement} dialogContainer - The dialog container element
     */
    function closeDialog(dialogContainer) {
        dialogContainer.classList.remove('active');
        setTimeout(() => {
            dialogContainer.innerHTML = '';
        }, 300);
    }
    
    /**
     * Show a confirmation dialog
     * @param {string} message - The message to show
     * @param {Function} onConfirm - Callback function when confirmed
     * @param {Function} onCancel - Callback function when cancelled
     */
    function showConfirmation(message, onConfirm, onCancel) {
        // Create confirmation modal
        const modalContainer = document.createElement('div');
        modalContainer.className = 'modal-container';
        
        modalContainer.innerHTML = `
            <div class="modal confirmation-modal">
                <div class="modal-body">
                    <p>${message}</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary cancel-btn">Cancel</button>
                    <button class="btn btn-danger confirm-btn">Confirm</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modalContainer);
        
        // Show with animation
        setTimeout(() => {
            modalContainer.classList.add('active');
        }, 10);
        
        // Add button handlers
        const cancelBtn = modalContainer.querySelector('.cancel-btn');
        const confirmBtn = modalContainer.querySelector('.confirm-btn');
        
        cancelBtn.addEventListener('click', () => {
            closeConfirmation(modalContainer);
            if (typeof onCancel === 'function') {
                onCancel();
            }
        });
        
        confirmBtn.addEventListener('click', () => {
            closeConfirmation(modalContainer);
            if (typeof onConfirm === 'function') {
                onConfirm();
            }
        });
    }
    
    /**
     * Close a confirmation dialog
     * @param {HTMLElement} modalContainer - The modal container
     */
    function closeConfirmation(modalContainer) {
        modalContainer.classList.remove('active');
        setTimeout(() => {
            document.body.removeChild(modalContainer);
        }, 300);
    }
    
    /**
     * Show loading spinner
     * @param {string} message - Optional loading message
     * @return {Object} - Control object with hide method
     */
    function showLoading(message = 'Loading...') {
        const loadingContainer = document.createElement('div');
        loadingContainer.className = 'loading-container';
        
        loadingContainer.innerHTML = `
            <div class="loading-spinner"></div>
            <p>${message}</p>
        `;
        
        document.body.appendChild(loadingContainer);
        
        return {
            hide: () => {
                document.body.removeChild(loadingContainer);
            },
            updateMessage: (newMessage) => {
                loadingContainer.querySelector('p').textContent = newMessage;
            }
        };
    }
    
    // Public API
    return {
        init: init,
        showToast: showToast,
        showConfirmDialog: showConfirmDialog,
        showConfirmation: showConfirmation,
        showLoading: showLoading
    };
})();
