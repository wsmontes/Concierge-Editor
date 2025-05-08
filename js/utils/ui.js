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
     * Apply saved theme preference or use system preference
     */
    function applySavedTheme() {
        const savedTheme = localStorage.getItem('theme');
        
        // Apply saved theme if available
        if (savedTheme) {
            document.documentElement.classList.toggle('dark-theme', savedTheme === 'dark');
            updateThemeIcon(savedTheme === 'dark');
        } 
        // Otherwise use system preference
        else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.classList.add('dark-theme');
            updateThemeIcon(true);
        }
        
        // Listen for system theme changes if no saved preference
        if (!savedTheme && window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
                document.documentElement.classList.toggle('dark-theme', e.matches);
                updateThemeIcon(e.matches);
            });
        }
    }
    
    /**
     * Update theme toggle icon based on current theme
     * @param {boolean} isDarkMode - Whether dark mode is enabled
     */
    function updateThemeIcon(isDarkMode) {
        const themeToggle = document.getElementById('theme-toggle');
        if (!themeToggle) return;
        
        const themeIcon = themeToggle.querySelector('i') || themeToggle.querySelector('span');
        if (themeIcon) {
            if (themeIcon.classList.contains('material-icons')) {
                themeIcon.textContent = isDarkMode ? 'light_mode' : 'dark_mode';
            } else {
                themeIcon.className = isDarkMode ? 'fas fa-sun' : 'fas fa-moon';
            }
        }
    }
    
    /**
     * Initialize toast notification container
     */
    function initToastContainer() {
        // Create toast container if it doesn't exist
        if (!document.getElementById('toast-container')) {
            const toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            document.body.appendChild(toastContainer);
        }
    }
    
    /**
     * Show a toast notification
     * @param {string} message - Message to display
     * @param {string} type - Toast type (info, success, warning, error)
     * @param {number} duration - Duration to show toast in milliseconds
     */
    function showToast(message, type = 'info', duration = 3000) {
        // Make sure container exists
        initToastContainer();
        const container = document.getElementById('toast-container');
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        // Add animation class
        toast.style.animationDuration = `${duration}ms`;
        
        // Create material icon based on type
        let icon = 'info';
        switch (type) {
            case 'success': icon = 'check_circle'; break;
            case 'error': icon = 'error'; break;
            case 'warning': icon = 'warning'; break;
        }
        
        // Set toast content with material icons
        toast.innerHTML = `
            <span class="material-icons">${icon}</span>
            <div class="toast-content">${message}</div>
            <button class="toast-close" aria-label="Close notification">
                <span class="material-icons">close</span>
            </button>
            <div class="toast-progress"></div>
        `;
        
        // Add close button functionality
        const closeBtn = toast.querySelector('.toast-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                closeToast(toast);
            });
        }
        
        // Add to container
        container.appendChild(toast);
        
        // Start animation
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Set timeout for auto-removal
        if (duration > 0) {
            setTimeout(() => {
                closeToast(toast);
            }, duration);
        }
        
        // Return toast element for potential later reference
        return toast;
    }
    
    /**
     * Close a toast notification
     * @param {HTMLElement} toast - Toast element to close
     */
    function closeToast(toast) {
        if (!toast) return;
        
        // Add hiding animation
        toast.classList.remove('show');
        toast.classList.add('hide');
        
        // Remove element after animation completes
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300); // Match animation duration in CSS
    }
    
    /**
     * Initialize tooltips for elements with 'data-tooltip' attribute
     */
    function initTooltips() {
        // Get all elements with tooltips
        const tooltipElements = document.querySelectorAll('[data-tooltip]');
        
        tooltipElements.forEach(element => {
            // Show tooltip on hover
            element.addEventListener('mouseenter', function() {
                const tooltipText = this.getAttribute('data-tooltip');
                if (!tooltipText) return;
                
                // Create tooltip
                const tooltip = document.createElement('div');
                tooltip.className = 'tooltip';
                tooltip.textContent = tooltipText;
                document.body.appendChild(tooltip);
                
                // Position tooltip
                const rect = this.getBoundingClientRect();
                const tooltipHeight = tooltip.offsetHeight;
                const tooltipWidth = tooltip.offsetWidth;
                
                tooltip.style.top = `${rect.top - tooltipHeight - 8 + window.scrollY}px`;
                tooltip.style.left = `${rect.left + (rect.width / 2) - (tooltipWidth / 2) + window.scrollX}px`;
                
                // Show tooltip with animation
                setTimeout(() => {
                    tooltip.classList.add('show');
                }, 10);
                
                // Store reference to tooltip
                this._tooltip = tooltip;
            });
            
            // Hide tooltip when mouse leaves
            element.addEventListener('mouseleave', function() {
                if (this._tooltip) {
                    this._tooltip.classList.remove('show');
                    setTimeout(() => {
                        if (this._tooltip && this._tooltip.parentNode) {
                            this._tooltip.parentNode.removeChild(this._tooltip);
                            this._tooltip = null;
                        }
                    }, 200);
                }
            });
        });
    }
    
    /**
     * Initialize accessibility features
     */
    function initAccessibilityFeatures() {
        // Apply focus outlines when using keyboard navigation
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Tab') {
                document.body.classList.add('keyboard-focus');
            }
        });
        
        // Remove focus outline when using mouse
        document.addEventListener('mousedown', function() {
            document.body.classList.remove('keyboard-focus');
        });
        
        // Check for reduced motion preference
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            document.documentElement.classList.add('reduced-motion');
        }
    }
    
    /**
     * Show a loading spinner overlay
     * @param {string} message - Optional message to display
     * @return {Object} - Loading spinner controller
     */
    function showLoading(message = 'Loading...') {
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        
        overlay.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
            </div>
            <div class="loading-message">${message}</div>
        `;
        
        document.body.appendChild(overlay);
        
        // Return controller to hide or update spinner
        return {
            hide: function() {
                overlay.classList.add('hide');
                setTimeout(() => {
                    if (overlay.parentNode) {
                        overlay.parentNode.removeChild(overlay);
                    }
                }, 300);
            },
            updateMessage: function(newMessage) {
                const messageElement = overlay.querySelector('.loading-message');
                if (messageElement) {
                    messageElement.textContent = newMessage;
                }
            }
        };
    }
    
    /**
     * Show a confirmation dialog
     * @param {string} message - Message to display
     * @param {Object} options - Dialog options
     * @return {Promise} - Resolves with true if confirmed, false if cancelled
     */
    function showConfirm(message, options = {}) {
        return new Promise((resolve) => {
            const defaults = {
                title: 'Confirm',
                confirmText: 'Confirm',
                cancelText: 'Cancel',
                type: 'info' // info, success, warning, error
            };
            
            const settings = { ...defaults, ...options };
            
            // Create modal element
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            
            // Set icon based on type
            let icon = 'help';
            switch (settings.type) {
                case 'success': icon = 'check_circle'; break;
                case 'error': icon = 'error'; break;
                case 'warning': icon = 'warning'; break;
                case 'info': icon = 'info'; break;
            }
            
            modal.innerHTML = `
                <div class="modal confirm-dialog ${settings.type}">
                    <div class="modal-header">
                        <h4>${settings.title}</h4>
                    </div>
                    <div class="modal-body">
                        <div class="modal-icon">
                            <span class="material-icons">${icon}</span>
                        </div>
                        <div class="modal-message">${message}</div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary cancel-btn">${settings.cancelText}</button>
                        <button class="btn btn-primary confirm-btn">${settings.confirmText}</button>
                    </div>
                </div>
            `;
            
            // Add to DOM
            document.body.appendChild(modal);
            
            // Show with animation
            setTimeout(() => {
                modal.classList.add('show');
                modal.querySelector('.confirm-dialog').classList.add('show');
            }, 10);
            
            // Set up button event listeners
            const confirmBtn = modal.querySelector('.confirm-btn');
            const cancelBtn = modal.querySelector('.cancel-btn');
            
            confirmBtn.addEventListener('click', () => {
                closeModal(modal);
                resolve(true);
            });
            
            cancelBtn.addEventListener('click', () => {
                closeModal(modal);
                resolve(false);
            });
            
            // Close modal function
            function closeModal(modal) {
                modal.classList.remove('show');
                modal.querySelector('.confirm-dialog').classList.remove('show');
                
                setTimeout(() => {
                    if (modal.parentNode) {
                        modal.parentNode.removeChild(modal);
                    }
                }, 300);
            }
        });
    }
    
    /**
     * Apply UI enhancements to elements
     * Call this when new content is dynamically added
     */
    function enhanceUI() {
        initTooltips();
        
        // Initialize custom selects
        document.querySelectorAll('select:not(.enhanced)').forEach(select => {
            select.classList.add('enhanced');
            // Additional select enhancement could be added here
        });
        
        // Initialize animated labels for inputs
        document.querySelectorAll('.form-group:not(.enhanced)').forEach(group => {
            group.classList.add('enhanced');
            const input = group.querySelector('input, textarea, select');
            const label = group.querySelector('label');
            
            if (input && label) {
                // Check initial state
                if (input.value !== '') {
                    label.classList.add('active');
                }
                
                // Add focus event
                input.addEventListener('focus', () => {
                    label.classList.add('active');
                });
                
                // Add blur event
                input.addEventListener('blur', () => {
                    if (input.value === '') {
                        label.classList.remove('active');
                    }
                });
            }
        });
    }

    // Public API
    return {
        init: init,
        showToast: showToast,
        showLoading: showLoading,
        showConfirm: showConfirm,
        enhanceUI: enhanceUI
    };
})();
