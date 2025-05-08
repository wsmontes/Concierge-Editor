/**
 * Gallery Module - Handles media gallery features
 * Dependencies: StorageModule for image retrieval, UIModule for notifications
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
                UIModule.showToast('Image upload functionality coming soon!', 'info');
            });
        }
        
        // Initial load of images
        loadGalleryImages('all');
    }
    
    /**
     * Populate the restaurant filter dropdown
     * @param {HTMLElement} filterSelect - The select element to populate
     */
    function populateRestaurantFilter(filterSelect) {
        if (!filterSelect) return;
        
        const restaurants = JSON.parse(localStorage.getItem('restaurants') || '[]');
        
        // Start with the "All Restaurants" option
        filterSelect.innerHTML = '<option value="all">All Restaurants</option>';
        
        // Add each restaurant as an option
        restaurants.forEach(restaurant => {
            const option = document.createElement('option');
            option.value = restaurant.id;
            option.textContent = restaurant.name;
            filterSelect.appendChild(option);
        });
    }
    
    /**
     * Load gallery images from storage
     * @param {string|number} restaurantId - Restaurant ID to filter by, or 'all' for all restaurants
     */
    async function loadGalleryImages(restaurantId) {
        const galleryGrid = document.querySelector('.gallery-grid');
        if (!galleryGrid) return;
        
        // Show loading state
        galleryGrid.innerHTML = '<div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i> Loading images...</div>';
        
        try {
            let photos = JSON.parse(localStorage.getItem('restaurantPhotos') || '[]');
            const restaurants = JSON.parse(localStorage.getItem('restaurants') || '[]');
            
            // Filter by restaurant if specified
            if (restaurantId && restaurantId !== 'all') {
                photos = photos.filter(photo => photo.restaurantId == restaurantId);
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
                    const restaurant = restaurants.find(r => r.id === photo.restaurantId);
                    const restaurantName = restaurant ? restaurant.name : 'Unknown Restaurant';
                    
                    // Get image URL from storage
                    const imageUrl = await StorageModule.getImageURL(photo.id.toString());
                    
                    if (imageUrl) {
                        // Create gallery item
                        const galleryItem = document.createElement('div');
                        galleryItem.className = 'gallery-item';
                        galleryItem.dataset.id = photo.id;
                        galleryItem.dataset.restaurantId = photo.restaurantId;
                        
                        galleryItem.innerHTML = `
                            <div class="gallery-item-image">
                                <img src="${imageUrl}" alt="${restaurantName} photo">
                            </div>
                            <div class="gallery-item-info">
                                <h4>${restaurantName}</h4>
                                <p>Photo ID: ${photo.id}</p>
                            </div>
                            <div class="gallery-item-actions">
                                <button class="btn btn-icon" title="View"><i class="fas fa-eye"></i></button>
                                <button class="btn btn-icon" title="Delete"><i class="fas fa-trash"></i></button>
                            </div>
                        `;
                        
                        // Add click handler for view button
                        const viewButton = galleryItem.querySelector('.btn-icon[title="View"]');
                        if (viewButton) {
                            viewButton.addEventListener('click', function() {
                                viewImage(photo.id, imageUrl, restaurantName);
                            });
                        }
                        
                        // Add click handler for delete button
                        const deleteButton = galleryItem.querySelector('.btn-icon[title="Delete"]');
                        if (deleteButton) {
                            deleteButton.addEventListener('click', function() {
                                if (confirm(`Delete this image from ${restaurantName}?`)) {
                                    deleteImage(photo.id, photo.restaurantId);
                                }
                            });
                        }
                        
                        galleryGrid.appendChild(galleryItem);
                    }
                } catch (error) {
                    console.error(`Error loading image ${photo.id}:`, error);
                }
            }
            
        } catch (error) {
            console.error('Error loading gallery images:', error);
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
                    <h3>${restaurantName}</h3>
                    <button class="close-modal"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <img src="${imageUrl}" alt="${restaurantName} photo">
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
            // Remove from storage
            await StorageModule.deleteImage(imageId.toString());
            
            // Remove from restaurantPhotos in localStorage
            const photos = JSON.parse(localStorage.getItem('restaurantPhotos') || '[]');
            const updatedPhotos = photos.filter(photo => photo.id != imageId);
            localStorage.setItem('restaurantPhotos', JSON.stringify(updatedPhotos));
            
            // Reload gallery
            const filterSelect = document.querySelector('#gallery-restaurant-filter');
            const currentFilter = filterSelect ? filterSelect.value : 'all';
            loadGalleryImages(currentFilter);
            
            // Update stats
            if (typeof updateAppStats === 'function') {
                updateAppStats();
            }
            
            UIModule.showToast('Image deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting image:', error);
            UIModule.showToast('Error deleting image', 'error');
        }
    }

    // Public API
    return {
        init: init,
        loadGalleryImages: loadGalleryImages
    };
})();
