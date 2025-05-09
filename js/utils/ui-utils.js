/**
 * UI Utilities - Helper functions for UI components
 * Dependencies: ServiceRegistry, ValidationService, ErrorHandlingService
 * Provides utility functions for UI components to interact with services
 */

const UIUtils = (function() {
    /**
     * Load restaurant data for UI display
     * @param {number} restaurantId - ID of restaurant to load
     * @param {Object} options - Options for loading
     * @return {Promise<Object>} - Promise with restaurant and related data
     */
    async function loadRestaurantData(restaurantId, options = {}) {
        try {
            const restaurantService = ServiceRegistry.getRestaurantService();
            const result = await restaurantService.getWithRelations(restaurantId);
            
            // Transform data for UI if needed
            if (options.formatForDisplay) {
                return formatRestaurantForDisplay(result);
            }
            
            return result;
        } catch (error) {
            ErrorHandlingService.handleError(error, `Loading restaurant ${restaurantId}`);
            throw error;
        }
    }
    
    /**
     * Load restaurants for listing
     * @param {Object} searchCriteria - Search and filter options
     * @return {Promise<Object>} - Promise with restaurants and pagination info
     */
    async function loadRestaurantList(searchCriteria = {}) {
        try {
            const restaurantService = ServiceRegistry.getRestaurantService();
            return await restaurantService.search(searchCriteria);
        } catch (error) {
            ErrorHandlingService.handleError(error, 'Loading restaurant list');
            return { restaurants: [], pagination: { total: 0 } };
        }
    }
    
    /**
     * Save restaurant data from UI form
     * @param {Object} formData - Form data to save
     * @param {Array} conceptIds - Selected concept IDs
     * @param {Object} locationData - Location data
     * @return {Promise<Object>} - Promise with saved restaurant
     */
    async function saveRestaurantForm(formData, conceptIds = [], locationData = null) {
        try {
            // Validate form data
            const validationResult = ValidationService.validateRestaurant(formData);
            if (!validationResult.valid) {
                throw new Error(`Validation errors: ${validationResult.errors.join(', ')}`);
            }
            
            // Save using restaurant service
            const restaurantService = ServiceRegistry.getRestaurantService();
            const savedRestaurant = await restaurantService.saveWithRelations(formData, {
                conceptIds,
                location: locationData
            });
            
            return savedRestaurant;
        } catch (error) {
            ErrorHandlingService.handleError(error, 'Saving restaurant form');
            throw error;
        }
    }
    
    /**
     * Upload and save restaurant image
     * @param {File} imageFile - Image file to upload
     * @param {number} restaurantId - Restaurant ID
     * @param {string} imageType - Type of image (e.g., 'primary', 'menu')
     * @return {Promise<Object>} - Promise with saved image reference
     */
    async function uploadRestaurantImage(imageFile, restaurantId, imageType = 'general') {
        try {
            if (!imageFile || !restaurantId) {
                throw new Error('Image file and restaurant ID are required');
            }
            
            const imageService = ServiceRegistry.getImageService();
            return await imageService.processImageUpload(imageFile, restaurantId, { type: imageType });
        } catch (error) {
            ErrorHandlingService.handleError(error, 'Uploading restaurant image');
            throw error;
        }
    }
    
    /**
     * Load concepts grouped by category
     * @return {Promise<Object>} - Promise with concepts grouped by category
     */
    async function loadConceptsByCategory() {
        try {
            const conceptService = ServiceRegistry.getConceptService();
            return await conceptService.getConceptsByCategory();
        } catch (error) {
            ErrorHandlingService.handleError(error, 'Loading concepts by category');
            return {};
        }
    }
    
    /**
     * Format validation errors for display in forms
     * @param {Object} validationResult - Validation result from ValidationService
     * @return {Object} - Formatted errors by field
     */
    function formatValidationErrors(validationResult) {
        if (!validationResult || validationResult.valid) {
            return {};
        }
        
        const errors = validationResult.errors || [];
        const errorsByField = {};
        
        // Simple mapping of errors to fields based on text content
        errors.forEach(error => {
            if (error.toLowerCase().includes('name')) {
                errorsByField.name = error;
            } else if (error.toLowerCase().includes('curator')) {
                errorsByField.curatorId = error;
            } else if (error.toLowerCase().includes('latitude') || error.toLowerCase().includes('longitude')) {
                errorsByField.location = error;
            } else {
                // General errors
                if (!errorsByField.general) {
                    errorsByField.general = [];
                }
                errorsByField.general.push(error);
            }
        });
        
        return errorsByField;
    }
    
    /**
     * Format restaurant data for display
     * @param {Object} data - Restaurant data with relations
     * @return {Object} - Formatted data for UI
     */
    function formatRestaurantForDisplay(data) {
        const { restaurant, concepts, location, curator, photos } = data;
        
        // Format dates
        const formattedDates = {};
        if (restaurant.timestamp) {
            const timestamp = new Date(restaurant.timestamp);
            formattedDates.created = timestamp.toLocaleDateString();
        }
        
        if (restaurant.lastModified) {
            const lastModified = new Date(restaurant.lastModified);
            formattedDates.modified = lastModified.toLocaleDateString();
        }
        
        // Format concepts
        const categorizedConcepts = {};
        concepts.forEach(concept => {
            if (!categorizedConcepts[concept.category]) {
                categorizedConcepts[concept.category] = [];
            }
            categorizedConcepts[concept.category].push(concept);
        });
        
        // Return formatted data
        return {
            restaurant,
            dates: formattedDates,
            curator: curator ? curator.name : 'Unknown',
            categorizedConcepts,
            location,
            photos: photos || [],
            hasLocation: !!location,
            hasConcepts: concepts.length > 0,
            hasPhotos: (photos || []).length > 0
        };
    }
    
    /**
     * Create notification toast
     * @param {string} message - Message to display
     * @param {string} type - Notification type ('success', 'error', 'info', 'warning')
     * @param {number} duration - Display duration in milliseconds
     */
    function showNotification(message, type = 'info', duration = 3000) {
        // Check if NotificationSystem exists
        if (window.NotificationSystem) {
            window.NotificationSystem.showNotification({
                type: type,
                message: message,
                duration: duration
            });
            return;
        }
        
        // Use UIModule if available
        if (typeof UIModule !== 'undefined' && typeof UIModule.showToast === 'function') {
            UIModule.showToast(message, type, duration);
            return;
        }
        
        // Fallback implementation
        const toastContainer = document.getElementById('toast-container') || 
            (() => {
                const container = document.createElement('div');
                container.id = 'toast-container';
                container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;';
                document.body.appendChild(container);
                return container;
            })();
            
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-message">${ValidationService.sanitizeString(message)}</div>
            <button class="toast-close">&times;</button>
        `;
        
        toast.style.cssText = 'margin-bottom:10px;padding:15px;background:#fff;border-radius:4px;box-shadow:0 2px 5px rgba(0,0,0,0.2);min-width:250px;';
        
        // Style based on type
        switch(type) {
            case 'success':
                toast.style.borderLeft = '4px solid #4CAF50';
                break;
            case 'error':
                toast.style.borderLeft = '4px solid #F44336';
                break;
            case 'warning':
                toast.style.borderLeft = '4px solid #FF9800';
                break;
            default:
                toast.style.borderLeft = '4px solid #2196F3';
        }
        
        const closeButton = toast.querySelector('.toast-close');
        closeButton.style.cssText = 'background:none;border:none;float:right;font-size:18px;cursor:pointer;';
        closeButton.addEventListener('click', () => {
            toast.remove();
        });
        
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, duration);
    }
    
    /**
     * Show a confirmation dialog
     * @param {string} message - Message to show
     * @param {Object} options - Dialog options
     * @return {Promise} - Promise that resolves with true if confirmed, false otherwise
     */
    function showConfirmation(message, options = {}) {
        const {
            title = 'Confirmation',
            confirmText = 'Confirm',
            cancelText = 'Cancel',
            confirmClass = 'btn-danger',
            cancelClass = 'btn-secondary'
        } = options;
        
        return new Promise((resolve) => {
            // Use UIModule if available
            if (typeof UIModule !== 'undefined' && typeof UIModule.showConfirmation === 'function') {
                UIModule.showConfirmation(message, () => resolve(true), () => resolve(false));
                return;
            }
            
            // Fallback implementation
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
            
            const dialog = document.createElement('div');
            dialog.style.cssText = 'background:#fff;border-radius:4px;padding:20px;max-width:400px;width:100%;box-shadow:0 2px 10px rgba(0,0,0,0.2);';
            
            dialog.innerHTML = `
                <h3 style="margin-top:0;">${ValidationService.sanitizeString(title)}</h3>
                <p>${ValidationService.sanitizeString(message)}</p>
                <div style="text-align:right;margin-top:20px;">
                    <button class="cancel-btn ${cancelClass}" style="margin-right:10px;padding:8px 15px;">${cancelText}</button>
                    <button class="confirm-btn ${confirmClass}" style="padding:8px 15px;">${confirmText}</button>
                </div>
            `;
            
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
            
            dialog.querySelector('.cancel-btn').addEventListener('click', () => {
                overlay.remove();
                resolve(false);
            });
            
            dialog.querySelector('.confirm-btn').addEventListener('click', () => {
                overlay.remove();
                resolve(true);
            });
        });
    }
    
    // Public API
    return {
        loadRestaurantData,
        loadRestaurantList,
        saveRestaurantForm,
        uploadRestaurantImage,
        loadConceptsByCategory,
        formatValidationErrors,
        formatRestaurantForDisplay,
        showNotification,
        showConfirmation
    };
})();
