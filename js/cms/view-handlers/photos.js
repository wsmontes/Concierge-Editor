/**
 * photos.js
 * 
 * Purpose: Implements the photo management view for adding, viewing,
 * and organizing restaurant photos in the CMS.
 * 
 * Dependencies:
 *   - concierge-data.js - For data access
 *   - ui-manager.js - For UI components
 */

const PhotosView = (() => {
    // View state management
    const state = {
        photos: [],
        restaurants: {},  // Map of restaurant ID to restaurant object
        currentPage: 1,
        itemsPerPage: 12,
        totalPages: 1,
        filterRestaurant: null,
        sortOrder: 'newest',  // newest, oldest
        filterText: ''
    };
    
    /**
     * Initializes the photos view
     * @param {HTMLElement} container - The container element to render the view in
     */
    const initialize = async (container) => {
        UIManager.setPageTitle('Photo Gallery');
        
        // Show loading state
        container.innerHTML = '';
        container.appendChild(UIManager.createLoadingSpinner());
        
        try {
            // Load initial data
            await loadInitialData();
            
            // Render the main view
            renderPhotosView(container);
            
            // Set up event listeners
            setupEventListeners();
            
        } catch (error) {
            console.error('Error initializing photos view:', error);
            container.innerHTML = '';
            container.appendChild(
                UIManager.createPlaceholder(
                    `Error loading photo data: ${error.message}. Please check your connection and try again.`,
                    'bi-exclamation-triangle'
                )
            );
        }
    };
    
    /**
     * Loads the initial data needed for the view
     */
    const loadInitialData = async () => {
        if (!ConciergeData.getDatabase().db) {
            throw new Error('Database not connected. Please initialize the database first.');
        }
        
        const restaurantModel = ConciergeData.getEntityModel('restaurant');
        if (!restaurantModel) {
            throw new Error('Restaurant model not found');
        }
        
        // Load photos and restaurants in parallel
        const [photos, restaurants] = await Promise.all([
            restaurantModel.restaurantPhotos.getAll(),
            restaurantModel.restaurants.getAll()
        ]);
        
        // Create a map of restaurant ID to restaurant object for easy lookup
        const restaurantMap = {};
        restaurants.forEach(restaurant => {
            restaurantMap[restaurant.id] = restaurant;
        });
        
        // Store in state
        state.photos = photos;
        state.restaurants = restaurantMap;
        
        // Calculate total pages
        state.totalPages = Math.ceil(state.photos.length / state.itemsPerPage) || 1;
    };
    
    /**
     * Renders the main photos view
     * @param {HTMLElement} container - The container element to render the view in
     */
    const renderPhotosView = (container) => {
        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h1 class="mb-0">Photo Gallery</h1>
                <button id="addPhotoBtn" class="btn btn-primary">
                    <i class="bi bi-plus-lg"></i> Add Photo
                </button>
            </div>
            
            <div class="card mb-4">
                <div class="card-header">
                    <div class="d-flex justify-content-between align-items-center flex-wrap">
                        <div class="d-flex align-items-center mb-2 mb-md-0">
                            <h5 class="card-title mb-0 me-3">Photos</h5>
                            <div class="dropdown">
                                <button class="btn btn-outline-secondary dropdown-toggle" type="button" id="restaurantFilterDropdown" data-bs-toggle="dropdown" aria-expanded="false">
                                    ${state.filterRestaurant ? `Restaurant: ${state.restaurants[state.filterRestaurant]?.name || 'Unknown'}` : 'All Restaurants'}
                                </button>
                                <ul class="dropdown-menu" aria-labelledby="restaurantFilterDropdown">
                                    <li><a class="dropdown-item ${!state.filterRestaurant ? 'active' : ''}" href="#" data-restaurant-id="all">All Restaurants</a></li>
                                    <li><hr class="dropdown-divider"></li>
                                    ${Object.values(state.restaurants).map(restaurant => 
                                        `<li><a class="dropdown-item ${state.filterRestaurant === restaurant.id ? 'active' : ''}" href="#" data-restaurant-id="${restaurant.id}">${restaurant.name}</a></li>`
                                    ).join('')}
                                </ul>
                            </div>
                        </div>
                        <div class="d-flex gap-2 align-items-center">
                            <div class="input-group">
                                <span class="input-group-text">
                                    <i class="bi bi-search"></i>
                                </span>
                                <input type="text" id="photoSearch" class="form-control" placeholder="Search photos...">
                            </div>
                            <div class="btn-group" role="group" aria-label="Sort order">
                                <button type="button" class="btn btn-outline-secondary ${state.sortOrder === 'newest' ? 'active' : ''}" data-sort="newest">Newest</button>
                                <button type="button" class="btn btn-outline-secondary ${state.sortOrder === 'oldest' ? 'active' : ''}" data-sort="oldest">Oldest</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="card-body">
                    <div class="row g-4" id="photoGallery">
                        ${renderPhotoGallery()}
                    </div>
                </div>
                <div class="card-footer">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            Showing <span id="currentRange">${calculateRange()}</span> of <span id="totalItems">${getFilteredPhotos().length}</span> photos
                        </div>
                        <div class="pagination-container">
                            <button id="prevPageBtn" class="btn btn-sm btn-outline-secondary" ${state.currentPage === 1 ? 'disabled' : ''}>
                                <i class="bi bi-chevron-left"></i>
                            </button>
                            <span class="mx-2">Page ${state.currentPage} of ${state.totalPages}</span>
                            <button id="nextPageBtn" class="btn btn-sm btn-outline-secondary" ${state.currentPage === state.totalPages ? 'disabled' : ''}>
                                <i class="bi bi-chevron-right"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    };
    
    /**
     * Gets filtered photos based on filter criteria
     * @returns {Array} Filtered photos
     */
    const getFilteredPhotos = () => {
        let filteredPhotos = state.photos;
        
        // Filter by restaurant if one is selected
        if (state.filterRestaurant) {
            filteredPhotos = filteredPhotos.filter(photo => photo.restaurantId === state.filterRestaurant);
        }
        
        // Filter by search text if present
        if (state.filterText) {
            const searchTerm = state.filterText.toLowerCase();
            filteredPhotos = filteredPhotos.filter(photo => {
                const restaurant = state.restaurants[photo.restaurantId];
                const restaurantName = restaurant ? restaurant.name.toLowerCase() : '';
                
                return (
                    (photo.caption && photo.caption.toLowerCase().includes(searchTerm)) ||
                    (photo.credit && photo.credit.toLowerCase().includes(searchTerm)) ||
                    restaurantName.includes(searchTerm)
                );
            });
        }
        
        // Sort photos
        if (state.sortOrder === 'newest') {
            filteredPhotos.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
        } else if (state.sortOrder === 'oldest') {
            filteredPhotos.sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));
        }
        
        return filteredPhotos;
    };
    
    /**
     * Calculates the current range of items being displayed
     * @returns {string} Range string (e.g., "1-12")
     */
    const calculateRange = () => {
        const filteredLength = getFilteredPhotos().length;
        const start = (state.currentPage - 1) * state.itemsPerPage + 1;
        const end = Math.min(start + state.itemsPerPage - 1, filteredLength);
        return filteredLength > 0 ? `${start}-${end}` : '0-0';
    };
    
    /**
     * Renders the photo gallery grid
     * @returns {string} HTML string for photo gallery
     */
    const renderPhotoGallery = () => {
        const filteredPhotos = getFilteredPhotos();
        
        if (filteredPhotos.length === 0) {
            return '<div class="col-12 text-center py-5"><p class="text-muted">No photos found</p></div>';
        }
        
        // Paginate photos
        const start = (state.currentPage - 1) * state.itemsPerPage;
        const paginatedPhotos = filteredPhotos.slice(start, start + state.itemsPerPage);
        
        return paginatedPhotos.map(photo => {
            const restaurant = state.restaurants[photo.restaurantId];
            const restaurantName = restaurant ? restaurant.name : 'Unknown Restaurant';
            
            return `
                <div class="col-sm-6 col-md-4 col-lg-3">
                    <div class="card h-100">
                        <img src="${photo.url}" class="card-img-top" alt="${photo.caption || 'Restaurant photo'}" 
                            onerror="this.src='https://via.placeholder.com/300x200?text=Image+Error'" loading="lazy" />
                        <div class="card-body">
                            <h6 class="card-title text-truncate" title="${photo.caption || 'No caption'}">${photo.caption || 'No caption'}</h6>
                            <p class="card-text small text-muted mb-0">Restaurant: ${restaurantName}</p>
                            ${photo.credit ? `<p class="card-text small text-muted mb-0">Credit: ${photo.credit}</p>` : ''}
                        </div>
                        <div class="card-footer bg-transparent border-top-0">
                            <div class="d-flex justify-content-between">
                                <button class="btn btn-sm btn-outline-primary view-photo" data-id="${photo.id}">
                                    <i class="bi bi-eye"></i> View
                                </button>
                                <button class="btn btn-sm btn-outline-danger delete-photo" data-id="${photo.id}">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    };
    
    /**
     * Sets up event listeners for the view
     */
    const setupEventListeners = () => {
        // Add photo button
        document.getElementById('addPhotoBtn')?.addEventListener('click', () => {
            showPhotoModal();
        });
        
        // Restaurant filter dropdown
        document.querySelectorAll('[data-restaurant-id]')?.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const restaurantId = item.dataset.restaurantId;
                
                state.filterRestaurant = restaurantId === 'all' ? null : parseInt(restaurantId);
                state.currentPage = 1; // Reset to first page when changing filter
                
                // Update UI
                renderPhotosView(document.getElementById('viewContainer'));
                setupEventListeners();
            });
        });
        
        // Sort buttons
        document.querySelectorAll('[data-sort]')?.forEach(button => {
            button.addEventListener('click', () => {
                const sortOrder = button.dataset.sort;
                if (state.sortOrder !== sortOrder) {
                    state.sortOrder = sortOrder;
                    refreshPhotoGallery();
                }
            });
        });
        
        // Search field
        document.getElementById('photoSearch')?.addEventListener('input', (e) => {
            state.filterText = e.target.value.trim();
            state.currentPage = 1; // Reset to first page when searching
            refreshPhotoGallery();
        });
        
        // Pagination buttons
        document.getElementById('prevPageBtn')?.addEventListener('click', () => {
            if (state.currentPage > 1) {
                state.currentPage--;
                refreshPhotoGallery();
            }
        });
        
        document.getElementById('nextPageBtn')?.addEventListener('click', () => {
            if (state.currentPage < state.totalPages) {
                state.currentPage++;
                refreshPhotoGallery();
            }
        });
        
        // View buttons
        document.querySelectorAll('.view-photo')?.forEach(button => {
            button.addEventListener('click', () => {
                const id = parseInt(button.dataset.id);
                viewPhotoDetails(id);
            });
        });
        
        // Delete buttons
        document.querySelectorAll('.delete-photo')?.forEach(button => {
            button.addEventListener('click', () => {
                const id = parseInt(button.dataset.id);
                deletePhoto(id);
            });
        });
    };
    
    /**
     * Shows the photo modal for adding a new photo
     */
    const showPhotoModal = async () => {
        // Create form element
        const form = await createPhotoForm();
        
        // Show modal
        UIManager.showModal({
            title: 'Add New Photo',
            content: form,
            size: 'lg',
            buttons: [
                {
                    text: 'Add Photo',
                    type: 'primary',
                    action: async (button) => {
                        button.disabled = true;
                        button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
                        
                        if (UIManager.validateForm(form)) {
                            const formData = UIManager.getFormValues(form);
                            await savePhoto(formData);
                        } else {
                            button.disabled = false;
                            button.textContent = 'Add Photo';
                        }
                    }
                },
                {
                    text: 'Cancel',
                    type: 'secondary',
                    action: 'close'
                }
            ]
        });
    };
    
    /**
     * Creates the photo form for the modal
     * @returns {HTMLElement} The form element
     */
    const createPhotoForm = async () => {
        // Get list of restaurants for the dropdown
        const restaurantModel = ConciergeData.getEntityModel('restaurant');
        const restaurants = await restaurantModel.restaurants.getAll();
        
        // Define form schema
        const formSchema = {
            fields: [
                {
                    id: 'restaurantId',
                    type: 'select',
                    label: 'Restaurant',
                    required: true,
                    errorMessage: 'Please select a restaurant',
                    options: restaurants.map(restaurant => ({
                        value: restaurant.id,
                        label: restaurant.name
                    })),
                    value: state.filterRestaurant || ''
                },
                {
                    id: 'url',
                    type: 'url',
                    label: 'Image URL',
                    placeholder: 'https://example.com/image.jpg',
                    required: true,
                    errorMessage: 'Please enter a valid image URL',
                    value: ''
                },
                {
                    id: 'caption',
                    type: 'text',
                    label: 'Caption',
                    placeholder: 'Descriptive caption for the image',
                    value: ''
                },
                {
                    id: 'credit',
                    type: 'text',
                    label: 'Credit',
                    placeholder: 'Photographer or source',
                    value: ''
                }
            ]
        };
        
        const form = UIManager.createForm(formSchema);
        
        // Add image preview functionality
        const urlInput = form.querySelector('#url');
        
        // Create and append the preview container
        const previewContainer = document.createElement('div');
        previewContainer.className = 'mt-3';
        previewContainer.innerHTML = `
            <label>Image Preview:</label>
            <div class="image-preview p-2 bg-light text-center rounded">
                <p class="mb-0 text-muted">Enter a valid image URL to see a preview</p>
            </div>
        `;
        form.querySelector('#url').closest('.mb-3').after(previewContainer);
        
        // Add event listener to URL input for preview
        urlInput.addEventListener('blur', () => {
            const imageUrl = urlInput.value.trim();
            if (imageUrl) {
                const previewImg = document.createElement('img');
                previewImg.className = 'img-fluid';
                previewImg.style.maxHeight = '200px';
                previewImg.src = imageUrl;
                previewImg.alt = 'Preview';
                previewImg.onerror = () => {
                    previewContainer.querySelector('.image-preview').innerHTML = '<p class="text-danger mb-0">Invalid image URL or image could not be loaded</p>';
                };
                previewImg.onload = () => {
                    previewContainer.querySelector('.image-preview').innerHTML = '';
                    previewContainer.querySelector('.image-preview').appendChild(previewImg);
                };
            } else {
                previewContainer.querySelector('.image-preview').innerHTML = '<p class="mb-0 text-muted">Enter a valid image URL to see a preview</p>';
            }
        });
        
        return form;
    };
    
    /**
     * Saves a new photo
     * @param {Object} formData - Form data from the photo form
     */
    const savePhoto = async (formData) => {
        try {
            const restaurantModel = ConciergeData.getEntityModel('restaurant');
            if (!restaurantModel) {
                throw new Error('Restaurant model not found');
            }
            
            // Prepare photo data
            const photoData = {
                restaurantId: parseInt(formData.restaurantId),
                url: formData.url,
                caption: formData.caption || undefined,
                credit: formData.credit || undefined,
                timestamp: new Date().toISOString()
            };
            
            // Add the photo
            const newId = await restaurantModel.restaurantPhotos.add(photoData);
            
            // Refresh data and UI
            await loadInitialData();
            renderPhotosView(document.getElementById('viewContainer'));
            setupEventListeners();
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('appModal'));
            if (modal) {
                modal.hide();
            }
            
            // Show success message
            UIManager.showToast(
                'success',
                'Photo Added',
                `Photo added successfully with ID ${newId}.`
            );
            
        } catch (error) {
            console.error('Error saving photo:', error);
            UIManager.showToast('danger', 'Error', `Failed to save photo: ${error.message}`);
            
            // Re-enable save button in case of error
            const modal = document.getElementById('appModal');
            if (modal) {
                const saveButton = modal.querySelector('.btn-primary');
                if (saveButton) {
                    saveButton.disabled = false;
                    saveButton.textContent = 'Add Photo';
                }
            }
        }
    };
    
    /**
     * Shows photo details in a fullscreen modal
     * @param {number} id - The photo ID to view
     */
    const viewPhotoDetails = async (id) => {
        try {
            const restaurantModel = ConciergeData.getEntityModel('restaurant');
            if (!restaurantModel) {
                throw new Error('Restaurant model not found');
            }
            
            // Get photo data
            const photo = await restaurantModel.restaurantPhotos.getById(id);
            if (!photo) {
                throw new Error(`Photo with ID ${id} not found`);
            }
            
            // Get restaurant data
            const restaurant = state.restaurants[photo.restaurantId] || { name: 'Unknown Restaurant' };
            
            // Show details modal
            UIManager.showModal({
                title: photo.caption || 'Photo Details',
                content: `
                    <div class="photo-details">
                        <div class="text-center mb-3">
                            <img src="${photo.url}" alt="${photo.caption || 'Restaurant photo'}" 
                                class="img-fluid rounded" style="max-height: 60vh;"
                                onerror="this.src='https://via.placeholder.com/800x600?text=Image+Error'" />
                        </div>
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <strong>Restaurant:</strong> ${restaurant.name}
                            </div>
                            <div class="col-md-6 mb-3">
                                <strong>Added:</strong> ${new Date(photo.timestamp).toLocaleDateString()}
                            </div>
                            ${photo.caption ? `
                                <div class="col-12 mb-3">
                                    <strong>Caption:</strong> ${photo.caption}
                                </div>
                            ` : ''}
                            ${photo.credit ? `
                                <div class="col-12 mb-3">
                                    <strong>Credit:</strong> ${photo.credit}
                                </div>
                            ` : ''}
                            <div class="col-12">
                                <strong>URL:</strong> 
                                <a href="${photo.url}" target="_blank" class="text-break">${photo.url}</a>
                            </div>
                        </div>
                    </div>
                `,
                size: 'lg',
                buttons: [
                    {
                        text: 'Delete Photo',
                        type: 'danger',
                        action: () => {
                            const modal = bootstrap.Modal.getInstance(document.getElementById('appModal'));
                            if (modal) {
                                modal.hide();
                                setTimeout(() => {
                                    deletePhoto(id);
                                }, 500);
                            }
                        }
                    },
                    {
                        text: 'Close',
                        type: 'secondary',
                        action: 'close'
                    }
                ]
            });
        } catch (error) {
            console.error(`Error viewing photo details ${id}:`, error);
            UIManager.showToast('danger', 'Error', `Could not load photo details: ${error.message}`);
        }
    };
    
    /**
     * Deletes a photo
     * @param {number} id - The photo ID to delete
     */
    const deletePhoto = async (id) => {
        // Show confirmation modal
        UIManager.showModal({
            title: 'Confirm Deletion',
            content: `
                <p>Are you sure you want to delete this photo? This action cannot be undone.</p>
            `,
            buttons: [
                {
                    text: 'Delete',
                    type: 'danger',
                    action: async (button) => {
                        button.disabled = true;
                        button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Deleting...';
                        
                        try {
                            const restaurantModel = ConciergeData.getEntityModel('restaurant');
                            if (!restaurantModel) {
                                throw new Error('Restaurant model not found');
                            }
                            
                            // Delete the photo
                            await restaurantModel.restaurantPhotos.delete(id);
                            
                            // Refresh data and UI
                            await loadInitialData();
                            renderPhotosView(document.getElementById('viewContainer'));
                            setupEventListeners();
                            
                            // Close modal
                            const modal = bootstrap.Modal.getInstance(document.getElementById('appModal'));
                            if (modal) {
                                modal.hide();
                            }
                            
                            UIManager.showToast('success', 'Success', 'Photo deleted successfully.');
                            
                        } catch (error) {
                            console.error(`Error deleting photo ${id}:`, error);
                            UIManager.showToast('danger', 'Error', `Failed to delete photo: ${error.message}`);
                            button.disabled = false;
                            button.textContent = 'Delete';
                        }
                    }
                },
                {
                    text: 'Cancel',
                    type: 'secondary',
                    action: 'close'
                }
            ]
        });
    };
    
    /**
     * Refreshes the photo gallery with current state
     */
    const refreshPhotoGallery = () => {
        // Update pagination values
        state.totalPages = Math.ceil(getFilteredPhotos().length / state.itemsPerPage) || 1;
        
        // Ensure current page is valid
        if (state.currentPage > state.totalPages) {
            state.currentPage = state.totalPages;
        }
        
        // Update gallery HTML
        const gallery = document.getElementById('photoGallery');
        if (gallery) {
            gallery.innerHTML = renderPhotoGallery();
            
            // Update range and total items
            document.getElementById('currentRange').textContent = calculateRange();
            document.getElementById('totalItems').textContent = getFilteredPhotos().length;
            
            // Update pagination button states
            const prevBtn = document.getElementById('prevPageBtn');
            const nextBtn = document.getElementById('nextPageBtn');
            
            if (prevBtn) prevBtn.disabled = state.currentPage === 1;
            if (nextBtn) nextBtn.disabled = state.currentPage === state.totalPages;
            
            // Update sort buttons
            document.querySelectorAll('[data-sort]').forEach(button => {
                button.classList.toggle('active', button.dataset.sort === state.sortOrder);
            });
            
            // Reattach event listeners
            setupEventListeners();
        }
    };
    
    /**
     * Cleanup when leaving the view
     */
    const onExit = () => {
        // Reset view state
        state.currentPage = 1;
        state.filterText = '';
    };
    
    // Public API
    return {
        initialize,
        onExit
    };
})();
