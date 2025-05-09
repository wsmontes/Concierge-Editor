/**
 * Restaurant Editor Example - Demonstrates proper service usage
 * Dependencies: ServiceRegistry, UIUtils, ValidationService, ErrorHandlingService
 * Shows how to implement a UI component using the service architecture
 */

const RestaurantEditorExample = (function() {
    // Private state
    let currentRestaurantId = null;
    let isEditing = false;
    let selectedConceptIds = [];
    
    /**
     * Initialize the editor
     * @param {string} containerId - ID of container element
     * @param {Object} options - Editor options
     */
    function init(containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container element ${containerId} not found`);
            return;
        }
        
        // Set default options
        const settings = {
            onSave: options.onSave || function() {},
            onCancel: options.onCancel || function() {},
            restaurantId: options.restaurantId || null
        };
        
        currentRestaurantId = settings.restaurantId;
        isEditing = !!currentRestaurantId;
        
        // Create editor UI
        renderEditor(container, settings);
        
        // Load data if editing
        if (isEditing) {
            loadRestaurantData(currentRestaurantId, container);
        }
        
        // Load concepts
        loadConcepts(container);
        
        // Set up event listeners
        setupEventListeners(container, settings);
    }
    
    /**
     * Render the editor UI
     * @param {Element} container - Container element
     * @param {Object} settings - Editor settings
     */
    function renderEditor(container, settings) {
        const title = isEditing ? 'Edit Restaurant' : 'Create New Restaurant';
        
        container.innerHTML = `
            <div class="restaurant-editor">
                <h2>${title}</h2>
                <form id="restaurant-form">
                    <!-- Restaurant details section -->
                    <div class="form-section">
                        <h3>Restaurant Details</h3>
                        <div class="form-group">
                            <label for="restaurant-name">Name *</label>
                            <input type="text" id="restaurant-name" name="name" required>
                            <div class="error-message" id="name-error"></div>
                        </div>
                        
                        <div class="form-group">
                            <label for="restaurant-description">Description</label>
                            <textarea id="restaurant-description" name="description" rows="3"></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label for="restaurant-status">Status</label>
                            <select id="restaurant-status" name="status">
                                <option value="draft">Draft</option>
                                <option value="revised">Revised</option>
                                <option value="production">Production</option>
                                <option value="archived">Archived</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="restaurant-curator">Curator *</label>
                            <select id="restaurant-curator" name="curatorId" required>
                                <option value="">Select curator...</option>
                                <!-- Curators will be loaded dynamically -->
                            </select>
                            <div class="error-message" id="curator-error"></div>
                        </div>
                    </div>
                    
                    <!-- Concepts section -->
                    <div class="form-section">
                        <h3>Concepts</h3>
                        <div id="concepts-container">
                            <!-- Concepts will be loaded dynamically -->
                            <p>Loading concepts...</p>
                        </div>
                    </div>
                    
                    <!-- Location section -->
                    <div class="form-section">
                        <h3>Location</h3>
                        <div class="form-group">
                            <label for="restaurant-latitude">Latitude</label>
                            <input type="number" id="restaurant-latitude" name="latitude" step="0.000001">
                        </div>
                        
                        <div class="form-group">
                            <label for="restaurant-longitude">Longitude</label>
                            <input type="number" id="restaurant-longitude" name="longitude" step="0.000001">
                        </div>
                        <div class="error-message" id="location-error"></div>
                    </div>
                    
                    <!-- Images section -->
                    <div class="form-section">
                        <h3>Images</h3>
                        <div id="images-container">
                            <div class="image-upload-container">
                                <input type="file" id="image-upload" accept="image/*" multiple>
                                <label for="image-upload" class="upload-button">Select Images</label>
                            </div>
                            <div id="image-preview-container"></div>
                        </div>
                    </div>
                    
                    <!-- Form actions -->
                    <div class="form-actions">
                        <button type="button" id="cancel-button" class="btn btn-secondary">Cancel</button>
                        <button type="submit" id="save-button" class="btn btn-primary">Save Restaurant</button>
                    </div>
                </form>
            </div>
        `;
    }
    
    /**
     * Load restaurant data for editing
     * @param {number} restaurantId - Restaurant ID to load
     * @param {Element} container - Container element
     */
    async function loadRestaurantData(restaurantId, container) {
        try {
            // Show loading state
            container.classList.add('loading');
            
            // Load restaurant data using UIUtils
            const data = await UIUtils.loadRestaurantData(restaurantId);
            
            // Populate form fields
            document.getElementById('restaurant-name').value = data.restaurant.name || '';
            document.getElementById('restaurant-description').value = data.restaurant.description || '';
            document.getElementById('restaurant-status').value = data.restaurant.status || 'draft';
            
            // Set curator if available
            if (data.restaurant.curatorId) {
                document.getElementById('restaurant-curator').value = data.restaurant.curatorId;
            }
            
            // Set location if available
            if (data.location) {
                document.getElementById('restaurant-latitude').value = data.location.latitude || '';
                document.getElementById('restaurant-longitude').value = data.location.longitude || '';
            }
            
            // Store selected concept IDs
            selectedConceptIds = data.concepts.map(concept => concept.id);
            
            // Load images
            if (data.photos && data.photos.length > 0) {
                const previewContainer = document.getElementById('image-preview-container');
                previewContainer.innerHTML = '';
                
                data.photos.forEach(photo => {
                    if (photo.url) {
                        const imageElement = document.createElement('div');
                        imageElement.className = 'image-preview';
                        imageElement.innerHTML = `
                            <img src="${photo.url}" alt="Restaurant image">
                            <button type="button" class="remove-image" data-id="${photo.id}">&times;</button>
                        `;
                        previewContainer.appendChild(imageElement);
                    }
                });
            }
            
            // Remove loading state
            container.classList.remove('loading');
        } catch (error) {
            // Handle error
            ErrorHandlingService.handleError(error, 'Loading restaurant data');
            UIUtils.showNotification(
                ErrorHandlingService.formatErrorForDisplay(error), 
                'error'
            );
            container.classList.remove('loading');
        }
    }
    
    /**
     * Load concepts for selection
     * @param {Element} container - Container element
     */
    async function loadConcepts(container) {
        try {
            const conceptsContainer = container.querySelector('#concepts-container');
            
            // Load concepts grouped by category
            const conceptsByCategory = await UIUtils.loadConceptsByCategory();
            
            // Generate HTML for concepts
            let conceptsHtml = '';
            
            Object.entries(conceptsByCategory).forEach(([category, concepts]) => {
                conceptsHtml += `
                    <div class="concept-category">
                        <h4>${category}</h4>
                        <div class="concept-list">
                `;
                
                concepts.forEach(concept => {
                    const isSelected = selectedConceptIds.includes(concept.id);
                    conceptsHtml += `
                        <label class="concept-checkbox">
                            <input type="checkbox" name="concepts[]" value="${concept.id}" 
                                ${isSelected ? 'checked' : ''}>
                            <span>${concept.value}</span>
                        </label>
                    `;
                });
                
                conceptsHtml += `
                        </div>
                    </div>
                `;
            });
            
            // Update container
            conceptsContainer.innerHTML = conceptsHtml || '<p>No concepts available</p>';
            
            // Load curators
            await loadCurators(container);
        } catch (error) {
            ErrorHandlingService.handleError(error, 'Loading concepts');
            const conceptsContainer = container.querySelector('#concepts-container');
            conceptsContainer.innerHTML = '<p>Error loading concepts. Please try again.</p>';
        }
    }
    
    /**
     * Load curators for selection
     * @param {Element} container - Container element
     */
    async function loadCurators(container) {
        try {
            const curatorSelect = container.querySelector('#restaurant-curator');
            
            // Get all curators using DataAccessUtil for now
            const curators = await DataAccessUtil.getCurators();
            
            // Generate options
            let optionsHtml = '<option value="">Select curator...</option>';
            
            curators.forEach(curator => {
                optionsHtml += `<option value="${curator.id}">${curator.name}</option>`;
            });
            
            curatorSelect.innerHTML = optionsHtml;
            
            // If editing, set selected curator
            if (isEditing && currentRestaurantId) {
                const restaurantService = ServiceRegistry.getRestaurantService();
                const restaurant = await restaurantService.getById(currentRestaurantId);
                
                if (restaurant && restaurant.curatorId) {
                    curatorSelect.value = restaurant.curatorId;
                }
            }
        } catch (error) {
            ErrorHandlingService.handleError(error, 'Loading curators');
        }
    }
    
    /**
     * Set up event listeners
     * @param {Element} container - Container element
     * @param {Object} settings - Editor settings
     */
    function setupEventListeners(container, settings) {
        const form = container.querySelector('#restaurant-form');
        const cancelButton = container.querySelector('#cancel-button');
        const imageUpload = container.querySelector('#image-upload');
        
        // Form submission
        form.addEventListener('submit', async function(event) {
            event.preventDefault();
            await saveRestaurant(container, settings);
        });
        
        // Cancel button
        cancelButton.addEventListener('click', function() {
            if (settings.onCancel) {
                settings.onCancel();
            }
        });
        
        // Image upload
        imageUpload.addEventListener('change', handleImageUpload);
        
        // Remove image buttons
        container.addEventListener('click', function(event) {
            if (event.target.classList.contains('remove-image')) {
                const imageId = event.target.getAttribute('data-id');
                removeImage(imageId, event.target.closest('.image-preview'));
            }
        });
    }
    
    /**
     * Handle image upload
     * @param {Event} event - Change event
     */
    async function handleImageUpload(event) {
        const files = event.target.files;
        const previewContainer = document.getElementById('image-preview-container');
        
        if (!files || files.length === 0) return;
        
        // Check if we have a restaurant ID (for new restaurants, we'll handle uploads after save)
        if (!currentRestaurantId) {
            // Just show previews, actual upload will happen after restaurant is saved
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    const imageElement = document.createElement('div');
                    imageElement.className = 'image-preview';
                    imageElement.innerHTML = `
                        <img src="${e.target.result}" alt="Restaurant image">
                        <span class="image-name">${file.name}</span>
                        <span class="upload-pending">Pending</span>
                    `;
                    previewContainer.appendChild(imageElement);
                };
                
                reader.readAsDataURL(file);
            }
            return;
        }
        
        // If we have an ID, upload directly
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            try {
                // Create temporary preview
                const tempId = 'temp-' + Date.now() + i;
                const imageElement = document.createElement('div');
                imageElement.className = 'image-preview';
                imageElement.innerHTML = `
                    <img src="#" alt="Uploading...">
                    <span class="image-name">${file.name}</span>
                    <span class="upload-progress">Uploading...</span>
                `;
                imageElement.id = tempId;
                previewContainer.appendChild(imageElement);
                
                // Upload image
                const result = await UIUtils.uploadRestaurantImage(file, currentRestaurantId);
                
                // Update preview with actual image
                const imageService = ServiceRegistry.getImageService();
                const imageUrl = await imageService.getImageUrl(result.id);
                
                imageElement.innerHTML = `
                    <img src="${imageUrl}" alt="Restaurant image">
                    <button type="button" class="remove-image" data-id="${result.id}">&times;</button>
                `;
            } catch (error) {
                ErrorHandlingService.handleError(error, 'Uploading image');
                UIUtils.showNotification(`Failed to upload image: ${error.message}`, 'error');
            }
        }
        
        // Reset file input
        event.target.value = '';
    }
    
    /**
     * Remove an image
     * @param {string} imageId - Image ID to remove
     * @param {Element} previewElement - Preview element to remove
     */
    async function removeImage(imageId, previewElement) {
        try {
            // Confirm deletion
            const confirmed = await UIUtils.showConfirmation('Are you sure you want to delete this image?', {
                title: 'Delete Image'
            });
            
            if (!confirmed) return;
            
            // If it's a temporary preview (no ID), just remove from DOM
            if (!imageId) {
                previewElement.remove();
                return;
            }
            
            // Delete from storage
            const imageService = ServiceRegistry.getImageService();
            await imageService.deleteImage(imageId);
            
            // Remove from DOM
            previewElement.remove();
            
            UIUtils.showNotification('Image deleted successfully', 'success');
        } catch (error) {
            ErrorHandlingService.handleError(error, 'Removing image');
            UIUtils.showNotification(`Failed to delete image: ${error.message}`, 'error');
        }
    }
    
    /**
     * Save restaurant
     * @param {Element} container - Container element
     * @param {Object} settings - Editor settings
     */
    async function saveRestaurant(container, settings) {
        try {
            clearValidationErrors(container);
            
            // Gather form data
            const form = container.querySelector('#restaurant-form');
            const formData = {
                name: form.querySelector('#restaurant-name').value,
                description: form.querySelector('#restaurant-description').value,
                status: form.querySelector('#restaurant-status').value,
                curatorId: parseInt(form.querySelector('#restaurant-curator').value),
            };
            
            // Add ID if editing
            if (isEditing && currentRestaurantId) {
                formData.id = currentRestaurantId;
            }
            
            // Gather location data
            const locationData = {
                latitude: parseFloat(form.querySelector('#restaurant-latitude').value) || null,
                longitude: parseFloat(form.querySelector('#restaurant-longitude').value) || null
            };
            
            // Only include location if both values are provided
            const hasLocation = locationData.latitude !== null && locationData.longitude !== null;
            
            // Gather selected concepts
            const conceptCheckboxes = form.querySelectorAll('input[name="concepts[]"]:checked');
            const conceptIds = Array.from(conceptCheckboxes).map(cb => parseInt(cb.value));
            
            // Validate data
            const validationResult = ValidationService.validateRestaurant(formData);
            if (!validationResult.valid) {
                showValidationErrors(container, validationResult);
                UIUtils.showNotification('Please correct the errors in the form', 'error');
                return;
            }
            
            // Validate location if provided
            if (hasLocation) {
                const locationValidation = ValidationService.validateLocation({
                    ...locationData,
                    restaurantId: formData.id || 0
                });
                
                if (!locationValidation.valid) {
                    showValidationErrors(container, locationValidation, 'location');
                    UIUtils.showNotification('Please correct the location errors', 'error');
                    return;
                }
            }
            
            // Show loading state
            container.classList.add('saving');
            const saveButton = container.querySelector('#save-button');
            const originalButtonText = saveButton.textContent;
            saveButton.textContent = 'Saving...';
            saveButton.disabled = true;
            
            // Save restaurant using service
            const restaurantService = ServiceRegistry.getRestaurantService();
            const savedRestaurant = await restaurantService.saveWithRelations(
                formData,
                {
                    conceptIds,
                    location: hasLocation ? locationData : null
                }
            );
            
            // Update current ID (for new restaurants)
            currentRestaurantId = savedRestaurant.id;
            isEditing = true;
            
            // Upload any pending images
            await processUnuploadedImages();
            
            // Show success message
            UIUtils.showNotification('Restaurant saved successfully', 'success');
            
            // Call onSave callback
            if (settings.onSave) {
                settings.onSave(savedRestaurant);
            }
            
            // Reset UI state
            container.classList.remove('saving');
            saveButton.textContent = originalButtonText;
            saveButton.disabled = false;
        } catch (error) {
            // Handle error
            ErrorHandlingService.handleError(error, 'Saving restaurant');
            
            // Show error notification
            UIUtils.showNotification(
                ErrorHandlingService.formatErrorForDisplay(error),
                'error'
            );
            
            // Reset UI state
            container.classList.remove('saving');
            const saveButton = container.querySelector('#save-button');
            saveButton.textContent = 'Save Restaurant';
            saveButton.disabled = false;
        }
    }
    
    /**
     * Process any unuploaded images
     */
    async function processUnuploadedImages() {
        if (!currentRestaurantId) return;
        
        const pendingElements = document.querySelectorAll('.upload-pending');
        if (pendingElements.length === 0) return;
        
        // Get file input
        const fileInput = document.getElementById('image-upload');
        if (!fileInput.files || fileInput.files.length === 0) return;
        
        const files = fileInput.files;
        const imageService = ServiceRegistry.getImageService();
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                // Upload image
                await imageService.processImageUpload(file, currentRestaurantId);
            } catch (error) {
                ErrorHandlingService.handleError(error, 'Processing pending image');
            }
        }
        
        // Reload images
        const previewContainer = document.getElementById('image-preview-container');
        previewContainer.innerHTML = '<p>Loading images...</p>';
        
        try {
            const images = await imageService.getRestaurantImages(currentRestaurantId);
            
            previewContainer.innerHTML = '';
            
            images.forEach(image => {
                if (image.url) {
                    const imageElement = document.createElement('div');
                    imageElement.className = 'image-preview';
                    imageElement.innerHTML = `
                        <img src="${image.url}" alt="Restaurant image">
                        <button type="button" class="remove-image" data-id="${image.id}">&times;</button>
                    `;
                    previewContainer.appendChild(imageElement);
                }
            });
        } catch (error) {
            previewContainer.innerHTML = '<p>Failed to load images</p>';
            ErrorHandlingService.handleError(error, 'Reloading images after upload');
        }
        
        // Reset file input
        fileInput.value = '';
    }
    
    /**
     * Show validation errors in the form
     * @param {Element} container - Container element
     * @param {Object} validationResult - Validation result
     * @param {string} [specificField] - Optional specific field to show errors for
     */
    function showValidationErrors(container, validationResult, specificField = null) {
        const errorsByField = UIUtils.formatValidationErrors(validationResult);
        
        if (specificField) {
            // Only show errors for a specific field
            const errorElement = container.querySelector(`#${specificField}-error`);
            if (errorElement && errorsByField[specificField]) {
                errorElement.textContent = errorsByField[specificField];
                errorElement.closest('.form-group').classList.add('has-error');
            }
            return;
        }
        
        // Show all errors
        Object.entries(errorsByField).forEach(([field, error]) => {
            if (field === 'general') {
                // General errors - show as notification
                if (Array.isArray(error)) {
                    error.forEach(e => UIUtils.showNotification(e, 'error'));
                } else {
                    UIUtils.showNotification(error, 'error');
                }
                return;
            }
            
            // Field-specific errors
            const errorElement = container.querySelector(`#${field}-error`);
            if (errorElement) {
                errorElement.textContent = error;
                errorElement.closest('.form-group').classList.add('has-error');
            }
        });
    }
    
    /**
     * Clear validation errors from the form
     * @param {Element} container - Container element
     */
    function clearValidationErrors(container) {
        const errorElements = container.querySelectorAll('.error-message');
        errorElements.forEach(element => {
            element.textContent = '';
            const formGroup = element.closest('.form-group');
            if (formGroup) {
                formGroup.classList.remove('has-error');
            }
        });
    }
    
    // Public API
    return {
        init
    };
})();
