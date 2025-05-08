/**
 * UI Module - Provides UI utilities and helper functions
 * Dependencies: None
 */

const UIModule = (function() {
    /**
     * Show a toast notification
     * @param {string} message - Message to display
     * @param {string} type - Notification type (success, error, info)
     */
    function showToast(message, type = 'success') {
        // Create toast element if it doesn't exist
        let toast = document.querySelector('.toast-notification');
        
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'toast-notification';
            document.body.appendChild(toast);
            
            // Add styles for the toast
            toast.style.position = 'fixed';
            toast.style.bottom = '20px';
            toast.style.right = '20px';
            toast.style.padding = '12px 20px';
            toast.style.borderRadius = '4px';
            toast.style.color = 'white';
            toast.style.boxShadow = '0 3px 10px rgba(0,0,0,0.15)';
            toast.style.transform = 'translateY(100px)';
            toast.style.opacity = '0';
            toast.style.transition = 'all 0.3s ease';
            toast.style.zIndex = '1000';
        }
        
        // Set toast type
        switch (type) {
            case 'success':
                toast.style.backgroundColor = '#10b981'; // Using the success color from the specification
                break;
            case 'error':
                toast.style.backgroundColor = '#ef4444'; // Using the error color from the specification
                break;
            case 'info':
                toast.style.backgroundColor = '#3b82f6'; // Using the info color from the specification
                break;
            case 'warning':
                toast.style.backgroundColor = '#f59e0b'; // Using the warning color from the specification
                break;
        }
        
        // Set message and show toast
        toast.textContent = message;
        setTimeout(() => {
            toast.style.transform = 'translateY(0)';
            toast.style.opacity = '1';
        }, 100);
        
        // Hide toast after 3 seconds
        setTimeout(() => {
            toast.style.transform = 'translateY(100px)';
            toast.style.opacity = '0';
        }, 3000);
    }

    /**
     * Create a debounced function
     * @param {Function} func - The function to debounce
     * @param {number} wait - The debounce wait time in milliseconds
     * @return {Function} - The debounced function
     */
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                func.apply(this, args);
            }, wait);
        };
    }

    // Public API
    return {
        showToast: showToast,
        debounce: debounce
    };
})();
