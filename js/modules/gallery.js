/**
 * Gallery Module - Handles media gallery features
 * Dependencies: ServiceRegistry, UIUtils, ErrorHandlingService, ValidationService
 * Provides UI for image gallery management
 */

const GalleryModule = (function() {
    /**
     * Initialize gallery functionality
     */
    function init() {
        const filterSelect = document.querySelector('#gallery-restaurant-filter');
        const typeFilterSelect = document.querySelector('#gallery-type-filter');
        const viewButtons = document.querySelectorAll('.gallery-actions .btn-icon');
        const uploadButton = document.getElementById('upload-media-btn');
        
        // Populate restaurant filter dropdown
        populateRestaurantFilter(filterSelect);
        
        if (filterSelect) {
            filterSelect.addEventListener('change', function() {
                loadGalleryImages(this.value);
            });
        }
        
        if (typeFilterSelect) {
            typeFilterSelect.addEventListener('change', function() {
                // This would filter by image type if we had that metadata
                // For now, just refresh the gallery
                const restaurantId = filterSelect ? filterSelect.value : 'all';
                loadGalleryImages(restaurantId);
            });
        }
        
        if (viewButtons && viewButtons.length >= 2) {
            // Grid view
            viewButtons[0].addEventListener('click', function() {
                const galleryGrid = document.querySelector('.gallery-grid');
                if (galleryGrid) {
                    galleryGrid.classList.remove('list-view');
                    galleryGrid.classList.add('grid-view');
                    
                    // Update active button
                    viewButtons.forEach(btn => btn.classList.remove('active'));
                    this.classList.add('active');
                }
            });
            
            // List view
            viewButtons[1].addEventListener('click', function() {
                const galleryGrid = document.querySelector('.gallery-grid');
                if (galleryGrid) {
                    galleryGrid.classList.remove('grid-view');
                    galleryGrid.classList.add('list-view');
                    
                    // Update active button
                    viewButtons.forEach(btn => btn.classList.remove('active'));
                    this.classList.add('active');
                }
            });
        }
        
        if (uploadButton) {
            uploadButton.addEventListener('click', function() {
                UIUtils.showNotification('Image upload functionality coming soon!', 'info');
            });
        }
        
        // Initial load of images
        loadGalleryImages('all');
    }
    
    /**
     * Populate the restaurant filter dropdown
     * @param {HTMLElement} filterSelect - The select element to populate
     */
    async function populateRestaurantFilter(filterSelect) {
        if (!filterSelect) return;
        
        try {
            // Get restaurant service
            const restaurantService = ServiceRegistry.getRestaurantService();
            
            // Get restaurants
            const restaurants = await restaurantService.getAll();
            
            // Start with the "All Restaurants" option
            filterSelect.innerHTML = '<option value="all">All Restaurants</option>';
            
            // Add each restaurant as an option
            restaurants.forEach(restaurant => {
                const option = document.createElement('option');
                option.value = restaurant.id;
                option.textContent = ValidationService.sanitizeString(restaurant.name);
                filterSelect.appendChild(option);
            });
        } catch (error) {
            ErrorHandlingService.handleError(error, 'Populating restaurant filter');
        }
    }
    
    /**
     * Load gallery images
     * @param {string|number} restaurantId - Restaurant ID to filter by, or 'all' for all restaurants
     */
    async function loadGalleryImages(restaurantId) {
        const galleryGrid = document.querySelector('.gallery-grid');
        if (!galleryGrid) return;
        
        // Show loading state
        galleryGrid.innerHTML = '<div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i> Loading images...</div>';
        
        try {
            // Get restaurant service and image service
            const restaurantService = ServiceRegistry.getRestaurantService();
            const imageService = ServiceRegistry.getImageService();
            
            // Get restaurant names for display
            const restaurants = await restaurantService.getAll();
            const restaurantMap = {};
            restaurants.forEach(restaurant => {
                restaurantMap[restaurant.id] = restaurant.name;
            });
            
            // Get photos
            let photos = [];
            
            if (restaurantId === 'all') {
                // Get all photos from each restaurant
                for (const restaurant of restaurants) {
                    const restaurantPhotos = await imageService.getRestaurantImages(restaurant.id);
                    photos = [...photos, ...restaurantPhotos];
                }
            } else {
                // Get photos for specific restaurant
                photos = await imageService.getRestaurantImages(restaurantId);
            }
            
            // If no photos, show empty state
            if (photos.length === 0) {
                galleryGrid.innerHTML = '<div class="empty-state">No images found</div>';
                return;
            }
            
            // Clear gallery
            galleryGrid.innerHTML = '';
            
            // Process each photo
            for (const photo of photos) {
                try {
                    // Get restaurant name
                    const restaurantName = restaurantMap[photo.restaurantId] || 'Unknown Restaurant';
                    
                    // Create gallery item
                    const galleryItem = document.createElement('div');
                    galleryItem.className = 'gallery-item';
                    galleryItem.dataset.id = photo.id;
                    galleryItem.dataset.restaurantId = photo.restaurantId;
                    
                    // Add appropriate content based on whether image loaded
                    if (photo.url) {
                        galleryItem.innerHTML = `
                            <div class="gallery-item-image">
                                <img src="${photo.url}" alt="${ValidationService.sanitizeString(restaurantName)} photo">
                            </div>
                            <div class="gallery-item-info">
                                <h4>${ValidationService.sanitizeString(restaurantName)}</h4>
                                <p>Photo ID: ${photo.id}</p>
                            </div>
                            <div class="gallery-item-actions">
                                <button class="btn btn-icon" title="View"><i class="fas fa-eye"></i></button>
                                <button class="btn btn-icon" title="Delete"><i class="fas fa-trash"></i></button>
                            </div>
                        `;
                    } else {
                        // Display placeholder with error indicator
                        galleryItem.innerHTML = `
                            <div class="gallery-item-image placeholder">
                                <div class="placeholder-icon"><i class="fas fa-image"></i></div>
                                <div class="error-badge" title="Image data not found"><i class="fas fa-exclamation-triangle"></i></div>
                            </div>
                            <div class="gallery-item-info">
                                <h4>${ValidationService.sanitizeString(restaurantName)}</h4>
                                <p>Photo ID: ${photo.id} (Data Missing)</p>
                            </div>
                            <div class="gallery-item-actions">
                                <button class="btn btn-icon btn-disabled" disabled title="View"><i class="fas fa-eye"></i></button>
                                <button class="btn btn-icon" title="Delete"><i class="fas fa-trash"></i></button>
                            </div>
                        `;
                    }
                    
                    // Add click handler for view button if image exists
                    if (photo.url) {
                        const viewButton = galleryItem.querySelector('.btn-icon[title="View"]');
                        if (viewButton) {
                            viewButton.addEventListener('click', function() {
                                viewImage(photo.id, photo.url, restaurantName);
                            });
                        }
                    }
                    
                    // Add click handler for delete button
                    const deleteButton = galleryItem.querySelector('.btn-icon[title="Delete"]');
                    if (deleteButton) {
                        deleteButton.addEventListener('click', function() {
                            UIUtils.showConfirmation(
                                `Delete this image from ${restaurantName}?`,
                                { 
                                    title: 'Delete Image',
                                    confirmText: 'Delete',
                                    confirmClass: 'btn-danger'
                                }
                            ).then(confirmed => {
                                if (confirmed) {
                                    deleteImage(photo.id, photo.restaurantId);
                                }
                            });
                        });
                    }
                    
                    galleryGrid.appendChild(galleryItem);
                } catch (error) {
                    ErrorHandlingService.handleError(error, `Processing gallery image ${photo.id}`);
                    // Continue with other images despite errors
                }
            }
        } catch (error) {
            ErrorHandlingService.handleError(error, 'Loading gallery images');
            galleryGrid.innerHTML = '<div class="error-state">Error loading images</div>';
        }
    }
    
    /**
     * View a full-size image
     * @param {string|number} imageId - ID of the image to view
     * @param {string} imageUrl - URL of the image
     * @param {string} restaurantName - Name of the restaurant
     */
    function viewImage(imageId, imageUrl, restaurantName) {
        // Create a modal for viewing the image
        const modal = document.createElement('div');
        modal.className = 'image-view-modal';
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${ValidationService.sanitizeString(restaurantName)}</h3>
                    <button class="close-modal"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <img src="${imageUrl}" alt="${ValidationService.sanitizeString(restaurantName)} photo">
                </div>
            </div>
        `;
        
        // Add close handler
        const closeButton = modal.querySelector('.close-modal');
        if (closeButton) {
            closeButton.addEventListener('click', function() {
                document.body.removeChild(modal);
            });
        }
        
        // Add click outside to close
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
        
        document.body.appendChild(modal);
    }
    
    /**
     * Delete an image
     * @param {string|number} imageId - ID of the image to delete
     * @param {string|number} restaurantId - ID of the restaurant
     */
    async function deleteImage(imageId, restaurantId) {
        try {
            // Get image service
            const imageService = ServiceRegistry.getImageService();
            
            // Delete image
            await imageService.deleteImage(imageId);
            
            // Reload gallery
            const filterSelect = document.querySelector('#gallery-restaurant-filter');
            const currentFilter = filterSelect ? filterSelect.value : 'all';
            loadGalleryImages(currentFilter);
            
            // Show success notification
            UIUtils.showNotification('Image deleted successfully', 'success');
        } catch (error) {
            ErrorHandlingService.handleError(error, 'Deleting image');
            UIUtils.showNotification(`Error deleting image: ${error.message}`, 'error');
        }
    }

    // Public API
    return {
        init,
        loadGalleryImages,
        deleteImage
    };
})();
