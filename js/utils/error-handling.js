/**
 * Error Handling Service - Centralized error handling
 * Dependencies: UIUtils
 * Provides consistent error handling throughout the application
 */

const ErrorHandlingService = (function() {
    /**
     * Handle an error consistently
     * @param {Error|string} error - Error object or message
     * @param {string} [context] - Optional context where the error occurred
     * @param {boolean} [showUI=true] - Whether to show a UI notification for the error
     */
    function handleError(error, context = 'Application', showUI = true) {
        // Ensure error is an Error object
        if (!(error instanceof Error) && typeof error !== 'string') {
            error = new Error('Unknown error');
        } else if (typeof error === 'string') {
            error = new Error(error);
        }
        
        // Log to console
        console.error(`Error in ${context}:`, error);
        
        // Show UI notification if requested
        if (showUI && typeof UIUtils !== 'undefined' && UIUtils.showNotification) {
            UIUtils.showNotification(`Error: ${error.message}`, 'error');
        }
        
        // Track error if analytics service is available
        if (typeof AnalyticsService !== 'undefined' && AnalyticsService.trackError) {
            AnalyticsService.trackError(error, context);
        }
    }
    
    /**
     * Log a warning
     * @param {string} message - Warning message
     * @param {string} [context] - Optional context where the warning occurred
     * @param {boolean} [showUI=false] - Whether to show a UI notification for the warning
     */
    function logWarning(message, context = 'Application', showUI = false) {
        // Log to console
        console.warn(`Warning in ${context}: ${message}`);
        
        // Show UI notification if requested
        if (showUI && typeof UIUtils !== 'undefined' && UIUtils.showNotification) {
            UIUtils.showNotification(`Warning: ${message}`, 'warning');
        }
    }
    
    /**
     * Create a user-friendly error message from a technical error
     * @param {Error} error - The error object
     * @return {string} - User-friendly message
     */
    function getUserFriendlyMessage(error) {
        // Check for common error types and provide friendly messages
        if (error.name === 'QuotaExceededError' || 
            error.message.includes('quota') || 
            error.message.includes('storage')) {
            return 'Your browser storage is full. Try clearing some space or using a different browser.';
        }
        
        if (error.name === 'NetworkError' || 
            error.message.includes('network') || 
            error.message.includes('connection')) {
            return 'There was a network error. Please check your internet connection and try again.';
        }
        
        if (error.name === 'InvalidStateError' || 
            error.message.includes('transaction') || 
            error.message.includes('state')) {
            return 'The application encountered a state error. Please refresh the page and try again.';
        }
        
        // Default message for unknown errors
        return 'An unexpected error occurred. Please try again or reload the application.';
    }
    
    /**
     * Show a technical error to developers in debug mode
     * @param {Error} error - The error object
     */
    function showDebugError(error) {
        // Only show in debug mode
        if (!window.DEBUG_MODE) return;
        
        const container = document.createElement('div');
        container.className = 'debug-error';
        container.innerHTML = `
            <div class="debug-error-header">
                <h3>Debug Error</h3>
                <button class="close-debug-error">&times;</button>
            </div>
            <div class="debug-error-body">
                <p class="error-name">${error.name}</p>
                <p class="error-message">${error.message}</p>
                <pre class="error-stack">${error.stack}</pre>
            </div>
        `;
        
        // Add close button functionality
        const closeButton = container.querySelector('.close-debug-error');
        if (closeButton) {
            closeButton.addEventListener('click', function() {
                container.remove();
            });
        }
        
        document.body.appendChild(container);
    }
    
    // Public API
    return {
        handleError,
        logWarning,
        getUserFriendlyMessage,
        showDebugError
    };
})();
