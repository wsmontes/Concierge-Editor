/**
 * Restaurant Module - Handles restaurant listings, viewing, editing, and deletion
 * Dependencies: UIModule for toast notifications, DataModule for data operations, StorageModule for image handling
 */

const RestaurantModule = (function() {
    // Restaurant status constants
    const STATUS = {
        DRAFT: 'draft',
        REVISED: 'revised',
        PRODUCTION: 'production',
        ARCHIVED: 'archived'
    };

    /**
     * Initialize restaurant functionality
     */
    function init() {
        initRestaurantListings();
        
        // Add event delegation for the view modes
        const viewButtons = document.querySelectorAll('.view-toggle-btn');
        if (viewButtons && viewButtons.length >= 3) {
            const listContainer = document.getElementById('restaurant-list');
            
            // Grid view
            viewButtons[0].addEventListener('click', function() {
                setViewMode('grid', viewButtons, listContainer);
            });
            
            // List view
            viewButtons[1].addEventListener('click', function() {
                setViewMode('list', viewButtons, listContainer);
            });
            
            // Table view
            viewButtons[2].addEventListener('click', function() {
                setViewMode('table', viewButtons, listContainer);
            });
            
            // Set the default view mode or restore from preference
            const savedViewMode = localStorage.getItem('restaurantViewMode') || 'list';
            const buttonIndex = savedViewMode === 'grid' ? 0 : (savedViewMode === 'list' ? 1 : 2);
            viewButtons[buttonIndex].click();
        }
    }

    /**
     * Set view mode for restaurant listings
     * @param {string} mode - The view mode (grid, list, table)
     * @param {NodeList} buttons - The view toggle buttons
     * @param {HTMLElement} container - The restaurant list container
     */
    function setViewMode(mode, buttons, container) {
        if (!container) return;
        
        // Reset all classes
        container.classList.remove('grid-view', 'list-view', 'table-view');
        container.classList.add(`${mode}-view`);
        
        // Update active button
        buttons.forEach(btn => btn.classList.remove('active'));
        const index = mode === 'grid' ? 0 : (mode === 'list' ? 1 : 2);
        buttons[index].classList.add('active');
        
        // Store preference
        localStorage.setItem('restaurantViewMode', mode);
        
        // Refresh the listing to match the new view mode
        updateRestaurantListings();
    }

    /**
     * Initialize and manage restaurant listings view
     */
    function initRestaurantListings() {
        const restaurantListContainer = document.getElementById('restaurant-list');
        const viewModeToggle = document.querySelectorAll('.view-toggle-btn');
        const sortOptions = document.getElementById('sort-restaurants');
        const restaurantFilters = document.getElementById('filter-restaurants');
        
        // Initial load of restaurants
        updateRestaurantListings();
        
        // Handle view mode toggle (grid vs list)
        if (viewModeToggle.length >= 2) {
            // Grid view
            viewModeToggle[0].addEventListener('click', function() {
                if (restaurantListContainer) {
                    restaurantListContainer.classList.remove('list-view');
                    restaurantListContainer.classList.add('grid-view');
                    
                    // Store preference
                    localStorage.setItem('restaurantViewMode', 'grid');
                    
                    // Update active toggle button
                    viewModeToggle.forEach(btn => btn.classList.remove('active'));
                    this.classList.add('active');
                }
            });
            
            // List view
            viewModeToggle[1].addEventListener('click', function() {
                if (restaurantListContainer) {
                    restaurantListContainer.classList.remove('grid-view');
                    restaurantListContainer.classList.add('list-view');
                    
                    // Store preference
                    localStorage.setItem('restaurantViewMode', 'list');
                    
                    // Update active toggle button
                    viewModeToggle.forEach(btn => btn.classList.remove('active'));
                    this.classList.add('active');
                }
            });
            
            // Set initial view based on saved preference
            const savedViewMode = localStorage.getItem('restaurantViewMode') || 'grid';
            const initialViewBtn = savedViewMode === 'grid' ? viewModeToggle[0] : viewModeToggle[1];
            if (initialViewBtn) {
                initialViewBtn.click();
            }
        }
        
        // Handle sorting
        if (sortOptions) {
            sortOptions.addEventListener('change', function() {
                updateRestaurantListings();
            });
        }
        
        // Handle filtering
        if (restaurantFilters) {
            restaurantFilters.addEventListener('change', function() {
                updateRestaurantListings();
            });
        }
        
        // Handle bulk selection
        const selectAllCheckbox = document.getElementById('select-all-restaurants');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', function() {
                const checkboxes = document.querySelectorAll('.restaurant-select');
                checkboxes.forEach(checkbox => {
                    checkbox.checked = this.checked;
                });
                
                // Update bulk action button states
                updateBulkActionButtons();
            });
        }
        
        // Bulk action buttons
        const bulkDeleteBtn = document.getElementById('bulk-delete');
        if (bulkDeleteBtn) {
            bulkDeleteBtn.addEventListener('click', function() {
                const selectedIds = getSelectedRestaurants();
                if (selectedIds.length > 0) {
                    if (confirm(`Are you sure you want to delete ${selectedIds.length} restaurants?`)) {
                        deleteRestaurants(selectedIds);
                        updateRestaurantListings();
                        UIModule.showToast(`Deleted ${selectedIds.length} restaurants`, 'success');
                    }
                } else {
                    UIModule.showToast('Please select restaurants to delete', 'info');
                }
            });
        }

        // Add status filter handling
        const statusFilter = document.getElementById('status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', function() {
                updateRestaurantListings();
            });
        }
        
        // Update restaurant listings
        updateRestaurantListings();
    }

    /**
     * Update the restaurant listings based on current sort, filter and view options
     */
    function updateRestaurantListings() {
        const restaurantListContainer = document.getElementById('restaurant-list');
        const sortOption = document.getElementById('sort-restaurants')?.value || 'name-asc';
        const filterOption = document.getElementById('filter-restaurants')?.value || 'all';
        const statusOption = document.getElementById('status-filter')?.value || 'all';
        const viewMode = localStorage.getItem('restaurantViewMode') || 'list';
        
        if (!restaurantListContainer) return;
        
        // Clear the container
        restaurantListContainer.innerHTML = '';
        
        // Get restaurants data
        let restaurants = JSON.parse(localStorage.getItem('restaurants') || '[]');
        
        // Apply status filter
        if (statusOption !== 'all') {
            restaurants = restaurants.filter(r => {
                const status = r.status || STATUS.DRAFT; // Default to draft if no status
                return status === statusOption;
            });
        }
        
        // Apply filter
        if (filterOption === 'no-concepts') {
            const restaurantConcepts = JSON.parse(localStorage.getItem('restaurantConcepts') || '[]');
            const restaurantsWithConcepts = new Set(restaurantConcepts.map(rc => rc.restaurantId));
            restaurants = restaurants.filter(r => !restaurantsWithConcepts.has(r.id));
        } else if (filterOption === 'new') {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            restaurants = restaurants.filter(r => new Date(r.timestamp) > oneWeekAgo);
        }
        
        // Apply sort
        switch (sortOption) {
            case 'name-asc':
                restaurants.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'name-desc':
                restaurants.sort((a, b) => b.name.localeCompare(a.name));
                break;
            case 'date-desc':
                restaurants.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                break;
            case 'date-asc':
                restaurants.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                break;
        }
        
        // Update the count
        const countElement = document.getElementById('restaurant-count');
        if (countElement) {
            countElement.textContent = `${restaurants.length} restaurant${restaurants.length !== 1 ? 's' : ''}`;
        }
        
        // Handle table view specifically
        if (viewMode === 'table') {
            createTableView(restaurantListContainer, restaurants);
            return;
        }
        
        // Create restaurant elements
        const promises = restaurants.map(restaurant => createRestaurantElement(restaurant, viewMode));
        
        Promise.all(promises)
            .then(elements => {
                elements.forEach(element => {
                    if (element) restaurantListContainer.appendChild(element);
                });
                
                updateBulkActionButtons();
            })
            .catch(error => {
                console.error('Error creating restaurant elements:', error);
                restaurantListContainer.innerHTML = `<div class="error-message">Error loading restaurants: ${error.message}</div>`;
            });
    }

    /**
     * Create table view for restaurants
     * @param {HTMLElement} container - The container element
     * @param {Array} restaurants - Array of restaurant objects
     */
    function createTableView(container, restaurants) {
        // Create header row
        const headerRow = document.createElement('div');
        headerRow.className = 'restaurant-row header-row';
        headerRow.innerHTML = `
            <div class="restaurant-cell checkbox">
                <input type="checkbox" id="select-all-restaurants">
            </div>
            <div class="restaurant-cell name">Name</div>
            <div class="restaurant-cell status">Status</div>
            <div class="restaurant-cell curator">Curator</div>
            <div class="restaurant-cell date">Date Added</div>
            <div class="restaurant-cell concepts">Concepts</div>
            <div class="restaurant-cell actions">Actions</div>
        `;
        container.appendChild(headerRow);
        
        // Setup select all functionality
        const selectAllCheckbox = headerRow.querySelector('#select-all-restaurants');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', function() {
                const checkboxes = document.querySelectorAll('.restaurant-select');
                checkboxes.forEach(checkbox => {
                    checkbox.checked = this.checked;
                });
                
                updateBulkActionButtons();
            });
        }
        
        // Create rows for each restaurant
        const curators = JSON.parse(localStorage.getItem('curators') || '[]');
        const conceptsData = JSON.parse(localStorage.getItem('concepts') || '[]');
        const restaurantConcepts = JSON.parse(localStorage.getItem('restaurantConcepts') || '[]');
        
        restaurants.forEach(restaurant => {
            const row = document.createElement('div');
            row.className = 'restaurant-row';
            
            // Find curator
            const curator = curators.find(c => c.id === restaurant.curatorId);
            
            // Get concepts for this restaurant
            const conceptIds = restaurantConcepts
                .filter(rc => rc.restaurantId === restaurant.id)
                .map(rc => rc.conceptId);
            
            const concepts = conceptsData
                .filter(c => conceptIds.includes(c.id))
                .slice(0, 5); // Limit to first 5 concepts
            
            const conceptsHtml = concepts.map(concept => 
                `<span class="concept-tag">${concept.value}</span>`
            ).join('');
            
            // Get status badge
            const status = restaurant.status || STATUS.DRAFT;
            const statusBadge = `<span class="status-badge ${status}">${status}</span>`;
            
            row.innerHTML = `
                <div class="restaurant-cell checkbox">
                    <input type="checkbox" class="restaurant-select" value="${restaurant.id}">
                </div>
                <div class="restaurant-cell name">${restaurant.name}</div>
                <div class="restaurant-cell status">${statusBadge}</div>
                <div class="restaurant-cell curator">${curator ? curator.name : 'Unknown'}</div>
                <div class="restaurant-cell date">${new Date(restaurant.timestamp).toLocaleDateString()}</div>
                <div class="restaurant-cell concepts">${conceptsHtml}</div>
                <div class="restaurant-cell actions">
                    <button class="btn btn-icon view-restaurant" data-id="${restaurant.id}" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon edit-restaurant" data-id="${restaurant.id}" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-icon delete-restaurant" data-id="${restaurant.id}" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            // Add event listeners to action buttons
            const viewBtn = row.querySelector('.view-restaurant');
            if (viewBtn) {
                viewBtn.addEventListener('click', function() {
                    viewRestaurantDetails(parseInt(this.dataset.id));
                });
            }
            
            const editBtn = row.querySelector('.edit-restaurant');
            if (editBtn) {
                editBtn.addEventListener('click', function() {
                    editRestaurant(parseInt(this.dataset.id));
                });
            }
            
            const deleteBtn = row.querySelector('.delete-restaurant');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', function() {
                    if (confirm(`Are you sure you want to delete "${restaurant.name}"?`)) {
                        deleteRestaurants([parseInt(this.dataset.id)]);
                        updateRestaurantListings();
                        UIModule.showToast('Restaurant deleted', 'success');
                    }
                });
            }
            
            const checkbox = row.querySelector('.restaurant-select');
            if (checkbox) {
                checkbox.addEventListener('change', updateBulkActionButtons);
            }
            
            container.appendChild(row);
        });
        
        if (restaurants.length === 0) {
            const emptyRow = document.createElement('div');
            emptyRow.className = 'restaurant-row empty-row';
            emptyRow.innerHTML = `
                <div class="restaurant-cell" colspan="7" style="text-align:center;padding:2rem;">
                    No restaurants found. Try adjusting your filters or adding a new restaurant.
                </div>
            `;
            container.appendChild(emptyRow);
        }
    }

    /**
     * Create a DOM element for a restaurant
     * @param {Object} restaurant - The restaurant data
     * @param {string} viewMode - The current view mode (grid/list)
     * @return {Promise<HTMLElement>} - The restaurant element
     */
    async function createRestaurantElement(restaurant, viewMode) {
        const element = document.createElement('div');
        element.className = 'restaurant-item';
        
        // Get curator
        const curators = JSON.parse(localStorage.getItem('curators') || '[]');
        const curator = curators.find(c => c.id === restaurant.curatorId);
        
        // Get concepts for this restaurant
        const restaurantConcepts = JSON.parse(localStorage.getItem('restaurantConcepts') || '[]');
        const concepts = JSON.parse(localStorage.getItem('concepts') || '[]');
        
        const restaurantConceptIds = restaurantConcepts
            .filter(rc => rc.restaurantId === restaurant.id)
            .map(rc => rc.conceptId);
            
        const restaurantConceptsData = concepts
            .filter(c => restaurantConceptIds.includes(c.id))
            .slice(0, 5); // Show only first 5 concepts in the card
        
        // Create concept tags HTML
        const conceptsHtml = restaurantConceptsData.length > 0
            ? '<div class="restaurant-concepts">' + 
              restaurantConceptsData.map(c => `<span class="concept-tag">${c.value}</span>`).join('') +
              (restaurantConceptIds.length > 5 ? `<span class="concept-more">+${restaurantConceptIds.length - 5} more</span>` : '') +
              '</div>'
            : '';
            
        // Get status badge
        const status = restaurant.status || STATUS.DRAFT;
        const statusBadge = `<span class="status-badge ${status}">${status}</span>`;

        // Try to get a restaurant image if available
        let imageHtml = '';
        try {
            const images = await StorageModule.getRestaurantImages(restaurant.id);
            if (images && images.length > 0) {
                const imageUrl = await StorageModule.getImageURL(images[0].id);
                if (imageUrl) {
                    imageHtml = `
                        <div class="restaurant-image">
                            <img src="${imageUrl}" alt="${restaurant.name}">
                        </div>
                    `;
                }
            }
        } catch (error) {
            console.warn('Could not load restaurant image:', error);
        }

        // Restaurant card HTML - different layouts based on view mode
        element.innerHTML = `
            <div class="restaurant-card">
                <div class="restaurant-header">
                    <input type="checkbox" class="restaurant-select" value="${restaurant.id}">
                    <h3>${restaurant.name} ${statusBadge}</h3>
                </div>
                ${imageHtml}
                <div class="restaurant-details">
                    <p class="restaurant-date">Added: ${new Date(restaurant.timestamp).toLocaleDateString()}</p>
                    <p class="restaurant-curator">By: ${curator ? curator.name : 'Unknown'}</p>
                    ${restaurant.description ? 
                        `<p class="restaurant-description">${restaurant.description.substring(0, 100)}${restaurant.description.length > 100 ? '...' : ''}</p>` 
                        : '<p class="restaurant-description empty">No description</p>'}
                    ${conceptsHtml}
                </div>
                <div class="restaurant-actions">
                    <button class="btn btn-icon view-restaurant" data-id="${restaurant.id}" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon edit-restaurant" data-id="${restaurant.id}" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-icon delete-restaurant" data-id="${restaurant.id}" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        
        // Add event listeners
        const viewBtn = element.querySelector('.view-restaurant');
        if (viewBtn) {
            viewBtn.addEventListener('click', function() {
                viewRestaurantDetails(parseInt(this.dataset.id));
            });
        }
        
        const editBtn = element.querySelector('.edit-restaurant');
        if (editBtn) {
            editBtn.addEventListener('click', function() {
                editRestaurant(parseInt(this.dataset.id));
            });
        }
        
        const deleteBtn = element.querySelector('.delete-restaurant');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', function() {
                if (confirm(`Are you sure you want to delete "${restaurant.name}"?`)) {
                    deleteRestaurants([parseInt(this.dataset.id)]);
                    updateRestaurantListings();
                    UIModule.showToast('Restaurant deleted', 'success');
                }
            });
        }
        
        const checkbox = element.querySelector('.restaurant-select');
        if (checkbox) {
            checkbox.addEventListener('change', updateBulkActionButtons);
        }
        
        return element;
    }

    /**
     * Update the state of bulk action buttons based on selections
     */
    function updateBulkActionButtons() {
        const selectedIds = getSelectedRestaurants();
        const bulkTagBtn = document.getElementById('bulk-tag');
        const exportDataBtn = document.getElementById('export-data');
        const bulkDeleteBtn = document.getElementById('bulk-delete');
        const selectedCounter = document.getElementById('selected-count');
        
        if (selectedCounter) {
            selectedCounter.textContent = selectedIds.length > 0 ? `${selectedIds.length} selected` : '';
        }
        
        if (bulkTagBtn) bulkTagBtn.disabled = selectedIds.length === 0;
        if (exportDataBtn) exportDataBtn.disabled = selectedIds.length === 0;
        if (bulkDeleteBtn) bulkDeleteBtn.disabled = selectedIds.length === 0;
    }

    /**
     * View restaurant details
     * @param {number} restaurantId - The ID of the restaurant
     */
    async function viewRestaurantDetails(restaurantId) {
        // Navigate to restaurant detail section
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        
        const detailSection = document.getElementById('restaurant-detail');
        if (detailSection) {
            detailSection.classList.add('active');
            
            // Update page title
            const pageTitle = document.getElementById('page-title');
            if (pageTitle) pageTitle.textContent = 'Restaurant Details';
            
            // Show loading state
            detailSection.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Loading restaurant details...</div>';
            
            // Get restaurant data
            const restaurants = JSON.parse(localStorage.getItem('restaurants') || '[]');
            const restaurant = restaurants.find(r => r.id === restaurantId);
            
            if (!restaurant) {
                detailSection.innerHTML = '<div class="error-state">Restaurant not found</div>';
                return;
            }
            
            // Get associated data
            const curators = JSON.parse(localStorage.getItem('curators') || '[]');
            const curator = curators.find(c => c.id === restaurant.curatorId);
            
            const restaurantConcepts = JSON.parse(localStorage.getItem('restaurantConcepts') || '[]');
            const concepts = JSON.parse(localStorage.getItem('concepts') || '[]');
            
            const conceptsByCategory = groupConceptsByCategory(restaurantId, restaurantConcepts, concepts);
            
            // Get restaurant location
            const locations = JSON.parse(localStorage.getItem('restaurantLocations') || '[]');
            const location = locations.find(l => l.restaurantId === restaurantId);
            
            // Get images
            let galleryHtml = '<p>No images available</p>';
            try {
                const images = await StorageModule.getRestaurantImages(restaurantId);
                if (images && images.length > 0) {
                    galleryHtml = '<div class="image-gallery">';
                    
                    for (const image of images) {
                        const imageUrl = await StorageModule.getImageURL(image.id);
                        if (imageUrl) {
                            galleryHtml += `
                                <div class="gallery-item">
                                    <img src="${imageUrl}" alt="${restaurant.name}">
                                </div>
                            `;
                        }
                    }
                    
                    galleryHtml += '</div>';
                }
            } catch (error) {
                console.warn('Could not load restaurant images:', error);
                galleryHtml = `<p class="error-message">Error loading images: ${error.message}</p>`;
            }
            
            // Create status controls
            const currentStatus = restaurant.status || STATUS.DRAFT;
            const statusControls = `
                <div class="status-controls">
                    <span class="status-label">Status:</span>
                    <button class="status-btn ${currentStatus === STATUS.DRAFT ? 'active' : ''}" data-status="${STATUS.DRAFT}">Draft</button>
                    <button class="status-btn ${currentStatus === STATUS.REVISED ? 'active' : ''}" data-status="${STATUS.REVISED}">Revised</button>
                    <button class="status-btn ${currentStatus === STATUS.PRODUCTION ? 'active' : ''}" data-status="${STATUS.PRODUCTION}">Production</button>
                    <button class="status-btn ${currentStatus === STATUS.ARCHIVED ? 'active' : ''}" data-status="${STATUS.ARCHIVED}">Archived</button>
                </div>
            `;
            
            // Render concepts by category
            let conceptsHtml = '<p>No concepts associated with this restaurant</p>';
            
            if (Object.keys(conceptsByCategory).length > 0) {
                conceptsHtml = '<div class="concepts-by-category">';
                
                for (const category in conceptsByCategory) {
                    conceptsHtml += `
                        <div class="concept-group">
                            <h4 class="concept-category">${category}</h4>
                            <div class="concept-tags">
                                ${conceptsByCategory[category].map(concept => 
                                    `<span class="concept-tag">${concept.value}</span>`
                                ).join('')}
                            </div>
                        </div>
                    `;
                }
                
                conceptsHtml += '</div>';
            }
            
            // Render location information
            let locationHtml = '<p>No location information available</p>';
            
            if (location) {
                locationHtml = `
                    <div class="location-info">
                        <div class="location-map">
                            <i class="fas fa-map-marker-alt"></i> Map Placeholder (${location.latitude}, ${location.longitude})
                        </div>
                        ${location.address ? `<p class="location-address">${location.address}</p>` : ''}
                    </div>
                `;
            }
            
            // Build detailed view
            detailSection.innerHTML = `
                <div class="restaurant-detail-header">
                    <div class="title-group">
                        <button class="btn btn-icon back-to-list">
                            <i class="fas fa-arrow-left"></i>
                        </button>
                        <h2>${restaurant.name}</h2>
                        <span class="status-badge ${currentStatus}">${currentStatus}</span>
                    </div>
                    <div class="detail-actions">
                        <button class="btn btn-secondary edit-restaurant-btn" data-id="${restaurant.id}">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                    </div>
                </div>
                
                <div class="restaurant-metadata">
                    <div class="metadata-item">
                        <i class="fas fa-user"></i>
                        <span>Added by: ${curator ? curator.name : 'Unknown'}</span>
                    </div>
                    <div class="metadata-item">
                        <i class="fas fa-calendar"></i>
                        <span>Added on: ${new Date(restaurant.timestamp).toLocaleString()}</span>
                    </div>
                </div>
                
                <div class="restaurant-detail-content">
                    <div class="restaurant-detail-main">
                        <div class="detail-card">
                            <h3>Description</h3>
                            ${restaurant.description ? 
                                `<p>${restaurant.description}</p>` : 
                                '<p class="empty-message">No description available</p>'}
                        </div>
                        
                        <div class="detail-card">
                            <h3>Transcription</h3>
                            ${restaurant.transcription ? 
                                `<div class="transcription-card">${restaurant.transcription}</div>` : 
                                '<p class="empty-message">No transcription available</p>'}
                        </div>
                        
                        <div class="detail-card">
                            <h3>Images</h3>
                            ${galleryHtml}
                        </div>
                    </div>
                    
                    <div class="restaurant-detail-sidebar">
                        <div class="detail-card">
                            <h3>Status</h3>
                            ${statusControls}
                        </div>
                        
                        <div class="detail-card">
                            <h3>Location</h3>
                            ${locationHtml}
                        </div>
                        
                        <div class="detail-card">
                            <h3>Concepts</h3>
                            ${conceptsHtml}
                        </div>
                    </div>
                </div>
            `;
            
            // Add event listeners
            const backButton = detailSection.querySelector('.back-to-list');
            if (backButton) {
                backButton.addEventListener('click', function() {
                    // Go back to restaurant list
                    document.querySelectorAll('.content-section').forEach(section => {
                        section.classList.remove('active');
                    });
                    
                    const restaurantsSection = document.getElementById('restaurants');
                    if (restaurantsSection) {
                        restaurantsSection.classList.add('active');
                        
                        // Update page title
                        const pageTitle = document.getElementById('page-title');
                        if (pageTitle) pageTitle.textContent = 'Restaurants';
                    }
                });
            }
            
            const editButton = detailSection.querySelector('.edit-restaurant-btn');
            if (editButton) {
                editButton.addEventListener('click', function() {
                    editRestaurant(parseInt(this.dataset.id));
                });
            }
            
            // Add status button listeners
            const statusButtons = detailSection.querySelectorAll('.status-btn');
            statusButtons.forEach(button => {
                button.addEventListener('click', function() {
                    const newStatus = this.dataset.status;
                    updateRestaurantStatus(restaurant.id, newStatus);
                    
                    // Update UI
                    statusButtons.forEach(btn => btn.classList.remove('active'));
                    this.classList.add('active');
                    
                    const statusBadge = detailSection.querySelector('.status-badge');
                    if (statusBadge) {
                        statusBadge.className = `status-badge ${newStatus}`;
                        statusBadge.textContent = newStatus;
                    }
                    
                    UIModule.showToast(`Restaurant status updated to ${newStatus}`, 'success');
                });
            });
        }
    }

    /**
     * Group concepts by category for a restaurant
     * @param {number} restaurantId - The restaurant ID
     * @param {Array} restaurantConcepts - Array of restaurant-concept relationships
     * @param {Array} allConcepts - Array of all concepts
     * @return {Object} - Object with category keys and arrays of concepts as values
     */
    function groupConceptsByCategory(restaurantId, restaurantConcepts, allConcepts) {
        const result = {};
        
        // Get concept IDs for this restaurant
        const conceptIds = restaurantConcepts
            .filter(rc => rc.restaurantId === restaurantId)
            .map(rc => rc.conceptId);
        
        // Get actual concept objects
        const concepts = allConcepts.filter(c => conceptIds.includes(c.id));
        
        // Group by category
        concepts.forEach(concept => {
            if (!result[concept.category]) {
                result[concept.category] = [];
            }
            result[concept.category].push(concept);
        });
        
        return result;
    }

    /**
     * Update a restaurant's status
     * @param {number} restaurantId - The restaurant ID to update
     * @param {string} newStatus - The new status
     */
    function updateRestaurantStatus(restaurantId, newStatus) {
        const restaurants = JSON.parse(localStorage.getItem('restaurants') || '[]');
        const index = restaurants.findIndex(r => r.id === restaurantId);
        
        if (index !== -1) {
            restaurants[index].status = newStatus;
            localStorage.setItem('restaurants', JSON.stringify(restaurants));
        }
    }

    /**
     * Initialize restaurant editing functionality
     * @param {number} restaurantId - The ID of the restaurant to edit
     */
    function editRestaurant(restaurantId) {
        // Implementation details omitted for brevity
        UIModule.showToast('Edit functionality not yet implemented', 'info');
    }

    /**
     * Delete restaurants by ID
     * @param {Array} restaurantIds - Array of restaurant IDs to delete
     */
    async function deleteRestaurants(restaurantIds) {
        if (!Array.isArray(restaurantIds) || restaurantIds.length === 0) return;
        
        try {
            // Delete restaurant images from storage
            await StorageModule.deleteRestaurantImages(restaurantIds);
            
            // Delete from restaurants
            let restaurants = JSON.parse(localStorage.getItem('restaurants') || '[]');
            restaurants = restaurants.filter(r => !restaurantIds.includes(r.id));
            localStorage.setItem('restaurants', JSON.stringify(restaurants));
            
            // Delete related restaurant concepts
            let restaurantConcepts = JSON.parse(localStorage.getItem('restaurantConcepts') || '[]');
            restaurantConcepts = restaurantConcepts.filter(rc => !restaurantIds.includes(rc.restaurantId));
            localStorage.setItem('restaurantConcepts', JSON.stringify(restaurantConcepts));
            
            // Delete related locations
            let locations = JSON.parse(localStorage.getItem('restaurantLocations') || '[]');
            locations = locations.filter(l => !restaurantIds.includes(l.restaurantId));
            localStorage.setItem('restaurantLocations', JSON.stringify(locations));
            
            // Delete related photo references
            let photos = JSON.parse(localStorage.getItem('restaurantPhotos') || '[]');
            photos = photos.filter(p => !restaurantIds.includes(p.restaurantId));
            localStorage.setItem('restaurantPhotos', JSON.stringify(photos));
        } catch (error) {
            console.error('Error deleting restaurants:', error);
            UIModule.showToast('Error deleting restaurant data', 'error');
        }
    }

    /**
     * Get selected restaurants from the UI
     * @return {Array} - Array of selected restaurant IDs
     */
    function getSelectedRestaurants() {
        const selectedCheckboxes = document.querySelectorAll('.restaurant-select:checked');
        return Array.from(selectedCheckboxes).map(cb => parseInt(cb.value));
    }

    // Public API
    return {
        init: init,
        updateRestaurantListings: updateRestaurantListings,
        viewRestaurantDetails: viewRestaurantDetails,
        editRestaurant: editRestaurant,
        deleteRestaurants: deleteRestaurants,
        getSelectedRestaurants: getSelectedRestaurants
    };
})();
