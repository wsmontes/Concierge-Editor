/**
 * Notification System - Handles UI notifications for user feedback
 * Dependencies: None
 * Provides a centralized system for showing toast notifications
 */

const NotificationSystem = (function() {
    // Container element for notifications
    let notificationContainer;
    
    // Settings
    const settings = {
        duration: 5000,       // Default duration in ms
        maxNotifications: 3,  // Maximum number of notifications to show at once
        position: 'top-right' // Position of notifications
    };
    
    // Initialize notification container
    function init() {
        // Create container if it doesn't exist
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.className = 'notification-container ' + settings.position;
            document.body.appendChild(notificationContainer);
        }
    }
    
    /**
     * Show a notification
     * @param {Object} options - Notification options
     * @param {string} options.type - Type of notification (success, error, warning, info)
     * @param {string} options.title - Title text
     * @param {string} options.message - Message text
     * @param {number} [options.duration] - Duration in ms before auto-dismiss
     * @param {boolean} [options.dismissible=true] - Whether notification can be dismissed
     * @return {HTMLElement} - The notification element
     */
    function showNotification(options) {
        init(); // Ensure container is initialized
        
        // Default options
        const config = {
            type: 'info',
            title: '',
            message: '',
            duration: settings.duration,
            dismissible: true,
            ...options
        };
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${config.type}`;
        
        // Add icon based on type
        let icon;
        switch (config.type) {
            case 'success':
                icon = '<i class="fas fa-check-circle"></i>';
                break;
            case 'error':
                icon = '<i class="fas fa-exclamation-circle"></i>';
                break;
            case 'warning':
                icon = '<i class="fas fa-exclamation-triangle"></i>';
                break;
            default: // info
                icon = '<i class="fas fa-info-circle"></i>';
        }
        
        // Build notification content
        notification.innerHTML = `
            <div class="notification-icon">${icon}</div>
            <div class="notification-content">
                ${config.title ? `<div class="notification-title">${config.title}</div>` : ''}
                <div class="notification-message">${config.message}</div>
            </div>
            ${config.dismissible ? '<button class="notification-close"><i class="fas fa-times"></i></button>' : ''}
            ${config.duration > 0 ? '<div class="notification-progress"></div>' : ''}
        `;
        
        // Add close button functionality
        if (config.dismissible) {
            const closeBtn = notification.querySelector('.notification-close');
            closeBtn.addEventListener('click', () => dismissNotification(notification));
        }
        
        // Add to container
        notificationContainer.appendChild(notification);
        
        // Limit number of notifications
        const notifications = notificationContainer.querySelectorAll('.notification');
        if (notifications.length > settings.maxNotifications) {
            notificationContainer.removeChild(notifications[0]);
        }
        
        // Show with animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Auto dismiss after duration
        if (config.duration > 0) {
            const progress = notification.querySelector('.notification-progress');
            
            // Animate progress bar
            if (progress) {
                progress.style.transition = `width ${config.duration}ms linear`;
                setTimeout(() => {
                    progress.style.width = '0%';
                }, 20);
            }
            
            // Set timeout for removal
            notification.timeoutId = setTimeout(() => {
                dismissNotification(notification);
            }, config.duration);
        }
        
        return notification;
    }
    
    /**
     * Dismiss a notification
     * @param {HTMLElement} notification - The notification element
     */
    function dismissNotification(notification) {
        // Clear timeout if exists
        if (notification.timeoutId) {
            clearTimeout(notification.timeoutId);
        }
        
        // Remove with animation
        notification.classList.remove('show');
        notification.classList.add('dismiss');
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300); // Match CSS animation duration
    }
    
    /**
     * Clear all notifications
     */
    function clearAllNotifications() {
        if (notificationContainer) {
            const notifications = notificationContainer.querySelectorAll('.notification');
            notifications.forEach(dismissNotification);
        }
    }
    
    /**
     * Update notification settings
     * @param {Object} newSettings - New settings
     */
    function updateSettings(newSettings) {
        Object.assign(settings, newSettings);
        
        // Update container position if it exists and position changed
        if (notificationContainer && newSettings.position) {
            notificationContainer.className = 'notification-container ' + settings.position;
        }
    }
    
    // Initialize on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Public API
    return {
        showNotification,
        dismissNotification,
        clearAllNotifications,
        updateSettings
    };
})();

// Make available globally
window.NotificationSystem = NotificationSystem;
