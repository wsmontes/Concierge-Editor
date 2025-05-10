/**
 * restaurants.js
 * 
 * Purpose: Implements the restaurant management view for creating, editing,
 * and deleting restaurant records in the CMS.
 * 
 * Dependencies:
 *   - concierge-data.js - For data access
 *   - ui-manager.js - For UI components
 */

const RestaurantsView = (() => {
    // View state management
    const state = {
        restaurants: [],
        concepts: [],
        categories: [],
        curators: [],
        editingRestaurant: null,
        currentPage: 1,
        itemsPerPage: 10,
        totalPages: 1,
        sortField: 'name',
        sortOrder: 'asc',
        filterText: '',
        allConceptsByCategory: {}
    };
    
    /**
     * Initializes the restaurants view
     * @param {HTMLElement} container - The container element to render the view in
     */
    const initialize = async (container) => {
        UIManager.setPageTitle('Restaurants');
        
        // Show loading state
        container.innerHTML = '';
        container.appendChild(UIManager.createLoadingSpinner());
        
        try {
            // Load initial data
            await loadInitialData();
            
            // Render the main view
            renderRestaurantsView(container);
            
            // Set up event listeners
            setupEventListeners();
            
        } catch (error) {
            console.error('Error initializing restaurants view:', error);
            container.innerHTML = '';
            container.appendChild(
                UIManager.createPlaceholder(
                    `Error loading restaurant data: ${error.message}. Please check your connection and try again.`,
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
        
        // Load restaurants, concepts, and curators in parallel
        const [restaurants, concepts, curators] = await Promise.all([
            restaurantModel.restaurants.getAll(),
            restaurantModel.concepts.getAll(),
            restaurantModel.curators.getAll()
        ]);
        
        // Store in state
        state.restaurants = restaurants;
        state.concepts = concepts;
        state.curators = curators;
        
        // Calculate total pages
        state.totalPages = Math.ceil(state.restaurants.length / state.itemsPerPage) || 1;
        
        // Extract unique categories from concepts
        state.categories = [...new Set(concepts.map(c => c.category))];
        
        // Group concepts by category for easier access
        state.allConceptsByCategory = {};
        concepts.forEach(concept => {
            if (!state.allConceptsByCategory[concept.category]) {
                state.allConceptsByCategory[concept.category] = [];
            }
            state.allConceptsByCategory[concept.category].push(concept);
        });
    };
    
    /**
     * Renders the main restaurants view
     * @param {HTMLElement} container - The container element to render the view in
     */
    const renderRestaurantsView = (container) => {
        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h1 class="mb-0">Restaurants</h1>
                <button id="addRestaurantBtn" class="btn btn-primary">
                    <i class="bi bi-plus-lg"></i> Add Restaurant
                </button>
            </div>
            
            <div class="card mb-4">
                <div class="card-header">
                    <div class="d-flex justify-content-between align-items-center">
                        <h5 class="card-title mb-0">Restaurant List</h5>
                        <div class="d-flex gap-2 align-items-center">
                            <div class="input-group">
                                <span class="input-group-text">
                                    <i class="bi bi-search"></i>
                                </span>
                                <input type="text" id="restaurantSearch" class="form-control" placeholder="Search restaurants...">
                            </div>
                        </div>
                    </div>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th class="sortable" data-sort="id">ID</th>
                                    <th class="sortable" data-sort="name">Name</th>
                                    <th class="sortable" data-sort="curatorId">Curator</th>
                                    <th>Concepts</th>
                                    <th>Locations</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="restaurantsTableBody">
                                ${renderRestaurantsTable()}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="card-footer">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            Showing <span id="currentRange">${calculateRange()}</span> of <span id="totalItems">${state.restaurants.length}</span> restaurants
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
     * Calculates the current range of items being displayed
     * @returns {string} Range string (e.g., "1-10")
     */
    const calculateRange = () => {
        const start = (state.currentPage - 1) * state.itemsPerPage + 1;
        const end = Math.min(start + state.itemsPerPage - 1, state.restaurants.length);
        return `${start}-${end}`;
    };
    
    /**
     * Renders the restaurant table rows based on current pagination and sorting
     * @returns {string} HTML string for table rows
     */
    const renderRestaurantsTable = () => {
        const { restaurants, currentPage, itemsPerPage, sortField, sortOrder, filterText } = state;
        
        if (!restaurants || restaurants.length === 0) {
            return `<tr><td colspan="6" class="text-center">No restaurants found</td></tr>`;
        }
        
        // Filter restaurants based on search text
        const filteredRestaurants = filterText 
            ? restaurants.filter(restaurant => 
                restaurant.name.toLowerCase().includes(filterText.toLowerCase()) ||
                getCuratorName(restaurant.curatorId).toLowerCase().includes(filterText.toLowerCase())
              )
            : restaurants;
            
        // Sort restaurants
        const sortedRestaurants = [...filteredRestaurants].sort((a, b) => {
            const aValue = a[sortField];
            const bValue = b[sortField];
            
            if (sortField === 'name') {
                return sortOrder === 'asc' 
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue);
            }
            
            return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
        });
        
        // Paginate restaurants
        const start = (currentPage - 1) * itemsPerPage;
        const paginatedRestaurants = sortedRestaurants.slice(start, start + itemsPerPage);
        
        if (paginatedRestaurants.length === 0) {
            return `<tr><td colspan="6" class="text-center">No restaurants match your search</td></tr>`;
        }
        
        return paginatedRestaurants.map(restaurant => {
            return `
                <tr>
                    <td>${restaurant.id}</td>
                    <td>${restaurant.name}</td>
                    <td>${getCuratorName(restaurant.curatorId)}</td>
                    <td>${getRestaurantConceptsBadges(restaurant.id)}</td>
                    <td>${getRestaurantLocationsBadge(restaurant.id)}</td>
                    <td>
                        <div class="d-flex gap-2">
                            <button class="btn btn-sm btn-outline-primary edit-restaurant" data-id="${restaurant.id}">
                                <i class="bi bi-pencil"></i> Edit
                            </button>
                            <button class="btn btn-sm btn-outline-danger delete-restaurant" data-id="${restaurant.id}">
                                <i class="bi bi-trash"></i> Delete
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    };
    
    /**
     * Gets the curator name for a given ID
     * @param {number} curatorId - The curator ID
     * @returns {string} Curator name or ID as string if not found
     */
    const getCuratorName = (curatorId) => {
        const curator = state.curators.find(c => c.id === curatorId);
        return curator ? curator.name : curatorId.toString();
    };
    
    /**
     * Gets concept badges HTML for a restaurant
     * @param {number} restaurantId - The restaurant ID
     * @returns {string} HTML for concept badges
     */
    const getRestaurantConceptsBadges = (restaurantId) => {
        // In a real implementation, this would fetch the concepts for the restaurant
        // For now, return a placeholder badge
        return '<span class="badge bg-primary">---</span>';
    };
    
    /**
     * Gets location badge HTML for a restaurant
     * @param {number} restaurantId - The restaurant ID
     * @returns {string} HTML for location badge
     */
    const getRestaurantLocationsBadge = (restaurantId) => {
        // In a real implementation, this would fetch the location count for the restaurant
        // For now, return a placeholder badge
        return '<span class="badge bg-secondary">---</span>';
    };
    
    /**
     * Sets up event listeners for the view
     */
    const setupEventListeners = () => {
        // Add restaurant button
        document.getElementById('addRestaurantBtn').addEventListener('click', () => {
            showRestaurantModal();
        });
        
        // Pagination buttons
        document.getElementById('prevPageBtn')?.addEventListener('click', () => {
            if (state.currentPage > 1) {
                state.currentPage--;
                refreshRestaurantTable();
            }
        });
        
        document.getElementById('nextPageBtn')?.addEventListener('click', () => {
            if (state.currentPage < state.totalPages) {
                state.currentPage++;
                refreshRestaurantTable();
            }
        });
        
        // Search field
        document.getElementById('restaurantSearch')?.addEventListener('input', (e) => {
            state.filterText = e.target.value.trim();
            state.currentPage = 1; // Reset to first page when searching
            refreshRestaurantTable();
        });
        
        // Sortable headers
        document.querySelectorAll('.sortable').forEach(header => {
            header.addEventListener('click', () => {
                const field = header.dataset.sort;
                
                // If clicking on the current sort field, toggle order
                if (field === state.sortField) {
                    state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
                } else {
                    // Otherwise, set the new field and default to ascending
                    state.sortField = field;
                    state.sortOrder = 'asc';
                }
                
                refreshRestaurantTable();
            });
        });
        
        // Edit buttons
        document.querySelectorAll('.edit-restaurant').forEach(button => {
            button.addEventListener('click', () => {
                const id = parseInt(button.dataset.id);
                editRestaurant(id);
            });
        });
        
        // Delete buttons
        document.querySelectorAll('.delete-restaurant').forEach(button => {
            button.addEventListener('click', () => {
                const id = parseInt(button.dataset.id);
                deleteRestaurant(id);
            });
        });
    };
    
    /**
     * Shows the restaurant modal for creating or editing
     * @param {Object} restaurant - Restaurant data for editing (null for create)
     */
    const showRestaurantModal = (restaurant = null) => {
        state.editingRestaurant = restaurant;
        
        const title = restaurant ? 'Edit Restaurant' : 'Add Restaurant';
        
        // Create form element
        const form = createRestaurantForm(restaurant);
        
        // Show modal
        UIManager.showModal({
            title,
            content: form,
            size: 'lg',
            buttons: [
                {
                    text: restaurant ? 'Update' : 'Create',
                    type: 'primary',
                    action: async (button) => {
                        button.disabled = true;
                        button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
                        
                        if (UIManager.validateForm(form)) {
                            const formData = UIManager.getFormValues(form);
                            await saveRestaurant(formData);
                        } else {
                            button.disabled = false;
                            button.textContent = restaurant ? 'Update' : 'Create';
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
     * Creates the restaurant form for the modal
     * @param {Object} restaurant - Restaurant data for editing (null for create)
     * @returns {HTMLElement} The form element
     */
    const createRestaurantForm = (restaurant) => {
        // Define form schema
        const formSchema = {
            fields: [
                {
                    id: 'id',
                    type: 'hidden',
                    value: restaurant?.id || ''
                },
                {
                    id: 'name',
                    type: 'text',
                    label: 'Restaurant Name',
                    placeholder: 'Enter restaurant name',
                    required: true,
                    errorMessage: 'Restaurant name is required',
                    value: restaurant?.name || ''
                },
                {
                    id: 'curatorId',
                    type: 'select',
                    label: 'Curator',
                    required: true,
                    errorMessage: 'Please select a curator',
                    options: state.curators.map(curator => ({
                        value: curator.id,
                        label: curator.name
                    })),
                    value: restaurant?.curatorId || ''
                },
                {
                    id: 'description',
                    type: 'textarea',
                    label: 'Description',
                    placeholder: 'Enter restaurant description',
                    rows: 3,
                    value: restaurant?.description || ''
                },
                {
                    id: 'websiteUrl',
                    type: 'url',
                    label: 'Website URL',
                    placeholder: 'https://www.example.com',
                    value: restaurant?.websiteUrl || ''
                }
            ]
        };
        
        return UIManager.createForm(formSchema);
    };
    
    /**
     * Saves a restaurant (create or update)
     * @param {Object} formData - Form data from the restaurant form
     */
    const saveRestaurant = async (formData) => {
        try {
            const restaurantModel = ConciergeData.getEntityModel('restaurant');
            if (!restaurantModel) {
                throw new Error('Restaurant model not found');
            }
            
            // Prepare restaurant data
            const restaurantData = {
                name: formData.name,
                curatorId: parseInt(formData.curatorId),
                description: formData.description || undefined,
                websiteUrl: formData.websiteUrl || undefined,
                timestamp: new Date().toISOString()
            };
            
            let result;
            
            // Either update or create
            if (formData.id) {
                restaurantData.id = parseInt(formData.id);
                await restaurantModel.restaurants.update(restaurantData);
                result = { id: restaurantData.id, isNew: false };
            } else {
                const newId = await restaurantModel.restaurants.add(restaurantData);
                result = { id: newId, isNew: true };
            }
            
            // Refresh data and UI
            await loadInitialData();
            refreshRestaurantTable();
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('appModal'));
            if (modal) {
                modal.hide();
            }
            
            // Show success message
            UIManager.showToast(
                'success',
                'Restaurant Saved',
                result.isNew 
                    ? `Restaurant "${formData.name}" created successfully with ID ${result.id}.`
                    : `Restaurant "${formData.name}" updated successfully.`
            );
            
        } catch (error) {
            console.error('Error saving restaurant:', error);
            UIManager.showToast('danger', 'Error', `Failed to save restaurant: ${error.message}`);
        }
    };
    
    /**
     * Opens the restaurant editor for a specific restaurant
     * @param {number} id - The restaurant ID to edit
     */
    const editRestaurant = async (id) => {
        try {
            const restaurantModel = ConciergeData.getEntityModel('restaurant');
            if (!restaurantModel) {
                throw new Error('Restaurant model not found');
            }
            
            // Get restaurant data
            const restaurant = await restaurantModel.restaurants.getById(id);
            if (!restaurant) {
                throw new Error(`Restaurant with ID ${id} not found`);
            }
            
            // Show edit modal
            showRestaurantModal(restaurant);
            
        } catch (error) {
            console.error(`Error editing restaurant ${id}:`, error);
            UIManager.showToast('danger', 'Error', `Could not load restaurant: ${error.message}`);
        }
    };
    
    /**
     * Deletes a restaurant
     * @param {number} id - The restaurant ID to delete
     */
    const deleteRestaurant = async (id) => {
        // Show confirmation modal
        UIManager.showModal({
            title: 'Confirm Deletion',
            content: `
                <p>Are you sure you want to delete this restaurant? This action cannot be undone.</p>
                <p class="text-danger"><strong>Warning:</strong> This will also delete all associated data (concepts, locations, photos).</p>
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
                            
                            // Delete the restaurant
                            await restaurantModel.restaurants.delete(id);
                            
                            // Refresh data and UI
                            await loadInitialData();
                            refreshRestaurantTable();
                            
                            // Close modal
                            const modal = bootstrap.Modal.getInstance(document.getElementById('appModal'));
                            if (modal) {
                                modal.hide();
                            }
                            
                            UIManager.showToast('success', 'Success', 'Restaurant deleted successfully.');
                            
                        } catch (error) {
                            console.error(`Error deleting restaurant ${id}:`, error);
                            UIManager.showToast('danger', 'Error', `Failed to delete restaurant: ${error.message}`);
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
     * Refreshes the restaurant table with current state
     */
    const refreshRestaurantTable = () => {
        const tableBody = document.getElementById('restaurantsTableBody');
        if (tableBody) {
            tableBody.innerHTML = renderRestaurantsTable();
            
            // Update pagination display
            document.getElementById('currentRange').textContent = calculateRange();
            document.getElementById('totalItems').textContent = state.restaurants.length;
            
            const prevBtn = document.getElementById('prevPageBtn');
            const nextBtn = document.getElementById('nextPageBtn');
            
            if (prevBtn) prevBtn.disabled = state.currentPage === 1;
            if (nextBtn) nextBtn.disabled = state.currentPage === state.totalPages;
            
            // Re-attach event listeners to new buttons
            document.querySelectorAll('.edit-restaurant').forEach(button => {
                button.addEventListener('click', () => {
                    const id = parseInt(button.dataset.id);
                    editRestaurant(id);
                });
            });
            
            document.querySelectorAll('.delete-restaurant').forEach(button => {
                button.addEventListener('click', () => {
                    const id = parseInt(button.dataset.id);
                    deleteRestaurant(id);
                });
            });
        }
    };
    
    /**
     * Cleanup when leaving the view
     */
    const onExit = () => {
        // Perform any cleanup needed when navigating away
    };
    
    // Public API
    return {
        initialize,
        onExit,
        editRestaurant
    };
})();
