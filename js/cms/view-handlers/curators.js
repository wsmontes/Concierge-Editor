/**
 * curators.js
 * 
 * Purpose: Implements the curators management view for creating, editing,
 * and managing restaurant curators in the CMS.
 * 
 * Dependencies:
 *   - concierge-data.js - For data access
 *   - ui-manager.js - For UI components
 */

const CuratorsView = (() => {
    // View state management
    const state = {
        curators: [],
        currentPage: 1,
        itemsPerPage: 10,
        totalPages: 1,
        sortField: 'name',
        sortOrder: 'asc',
        filterText: ''
    };
    
    /**
     * Initializes the curators view
     * @param {HTMLElement} container - The container element to render the view in
     */
    const initialize = async (container) => {
        UIManager.setPageTitle('Curators');
        
        // Show loading state
        container.innerHTML = '';
        container.appendChild(UIManager.createLoadingSpinner());
        
        try {
            // Load initial data
            await loadInitialData();
            
            // Render the main view
            renderCuratorsView(container);
            
            // Set up event listeners
            setupEventListeners();
            
        } catch (error) {
            console.error('Error initializing curators view:', error);
            container.innerHTML = '';
            container.appendChild(
                UIManager.createPlaceholder(
                    `Error loading curator data: ${error.message}. Please check your connection and try again.`,
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
        
        // Load curators and their associated restaurants in parallel
        const [curators, restaurants] = await Promise.all([
            restaurantModel.curators.getAll(),
            restaurantModel.restaurants.getAll()
        ]);
        
        // Count restaurants per curator
        const curatorRestaurantCounts = {};
        restaurants.forEach(restaurant => {
            if (!curatorRestaurantCounts[restaurant.curatorId]) {
                curatorRestaurantCounts[restaurant.curatorId] = 0;
            }
            curatorRestaurantCounts[restaurant.curatorId]++;
        });
        
        // Enhance curator objects with restaurant count
        const enhancedCurators = curators.map(curator => ({
            ...curator,
            restaurantCount: curatorRestaurantCounts[curator.id] || 0
        }));
        
        // Store in state
        state.curators = enhancedCurators;
        
        // Calculate total pages
        state.totalPages = Math.ceil(state.curators.length / state.itemsPerPage) || 1;
    };
    
    /**
     * Renders the main curators view
     * @param {HTMLElement} container - The container element to render the view in
     */
    const renderCuratorsView = (container) => {
        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h1 class="mb-0">Curators</h1>
                <button id="addCuratorBtn" class="btn btn-primary">
                    <i class="bi bi-plus-lg"></i> Add Curator
                </button>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <div class="d-flex justify-content-between align-items-center">
                        <h5 class="card-title mb-0">Curator List</h5>
                        <div class="d-flex gap-2 align-items-center">
                            <div class="input-group">
                                <span class="input-group-text">
                                    <i class="bi bi-search"></i>
                                </span>
                                <input type="text" id="curatorSearch" class="form-control" placeholder="Search curators...">
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
                                    <th class="sortable" data-sort="lastActive">Last Active</th>
                                    <th class="sortable" data-sort="restaurantCount">Restaurants</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="curatorsTableBody">
                                ${renderCuratorsTable()}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="card-footer">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            Showing <span id="currentRange">${calculateRange()}</span> of <span id="totalItems">${getFilteredCurators().length}</span> curators
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
     * Gets filtered curators based on search text
     * @returns {Array} Filtered curators
     */
    const getFilteredCurators = () => {
        if (!state.filterText) {
            return state.curators;
        }
        
        const searchTerm = state.filterText.toLowerCase();
        return state.curators.filter(curator => 
            curator.name.toLowerCase().includes(searchTerm)
        );
    };
    
    /**
     * Calculates the current range of items being displayed
     * @returns {string} Range string (e.g., "1-10")
     */
    const calculateRange = () => {
        const filteredLength = getFilteredCurators().length;
        const start = (state.currentPage - 1) * state.itemsPerPage + 1;
        const end = Math.min(start + state.itemsPerPage - 1, filteredLength);
        return filteredLength > 0 ? `${start}-${end}` : '0-0';
    };
    
    /**
     * Renders the curators table rows based on current pagination and sorting
     * @returns {string} HTML string for table rows
     */
    const renderCuratorsTable = () => {
        const filteredCurators = getFilteredCurators();
        
        if (filteredCurators.length === 0) {
            return `<tr><td colspan="5" class="text-center">No curators found</td></tr>`;
        }
        
        // Sort curators
        const sortedCurators = [...filteredCurators].sort((a, b) => {
            const aValue = a[state.sortField];
            const bValue = b[state.sortField];
            
            if (state.sortField === 'name') {
                return state.sortOrder === 'asc' 
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue);
            } else if (state.sortField === 'lastActive') {
                const aDate = new Date(aValue || '1970-01-01');
                const bDate = new Date(bValue || '1970-01-01');
                return state.sortOrder === 'asc' 
                    ? aDate - bDate
                    : bDate - aDate;
            }
            
            return state.sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
        });
        
        // Paginate curators
        const start = (state.currentPage - 1) * state.itemsPerPage;
        const paginatedCurators = sortedCurators.slice(start, start + state.itemsPerPage);
        
        return paginatedCurators.map(curator => {
            const lastActive = curator.lastActive 
                ? new Date(curator.lastActive).toLocaleDateString() 
                : 'Unknown';
                
            return `
                <tr>
                    <td>${curator.id}</td>
                    <td>${curator.name}</td>
                    <td>${lastActive}</td>
                    <td>
                        <span class="badge bg-primary">${curator.restaurantCount}</span>
                    </td>
                    <td>
                        <div class="d-flex gap-2">
                            <button class="btn btn-sm btn-outline-primary edit-curator" data-id="${curator.id}">
                                <i class="bi bi-pencil"></i> Edit
                            </button>
                            <button class="btn btn-sm btn-outline-danger delete-curator" data-id="${curator.id}" ${curator.restaurantCount > 0 ? 'disabled' : ''} title="${curator.restaurantCount > 0 ? 'Cannot delete curator with associated restaurants' : 'Delete curator'}">
                                <i class="bi bi-trash"></i> Delete
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    };
    
    /**
     * Sets up event listeners for the view
     */
    const setupEventListeners = () => {
        // Add curator button
        document.getElementById('addCuratorBtn')?.addEventListener('click', () => {
            showCuratorModal();
        });
        
        // Pagination buttons
        document.getElementById('prevPageBtn')?.addEventListener('click', () => {
            if (state.currentPage > 1) {
                state.currentPage--;
                refreshCuratorsTable();
            }
        });
        
        document.getElementById('nextPageBtn')?.addEventListener('click', () => {
            if (state.currentPage < state.totalPages) {
                state.currentPage++;
                refreshCuratorsTable();
            }
        });
        
        // Search field
        document.getElementById('curatorSearch')?.addEventListener('input', (e) => {
            state.filterText = e.target.value.trim();
            state.currentPage = 1; // Reset to first page when searching
            refreshCuratorsTable();
        });
        
        // Sortable headers
        document.querySelectorAll('.sortable')?.forEach(header => {
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
                
                refreshCuratorsTable();
            });
        });
        
        // Edit buttons
        document.querySelectorAll('.edit-curator')?.forEach(button => {
            button.addEventListener('click', () => {
                const id = parseInt(button.dataset.id);
                editCurator(id);
            });
        });
        
        // Delete buttons
        document.querySelectorAll('.delete-curator')?.forEach(button => {
            if (!button.disabled) {
                button.addEventListener('click', () => {
                    const id = parseInt(button.dataset.id);
                    deleteCurator(id);
                });
            }
        });
    };
    
    /**
     * Shows the curator modal for creating or editing
     * @param {Object} curator - Curator data for editing (null for create)
     */
    const showCuratorModal = (curator = null) => {
        const title = curator ? 'Edit Curator' : 'Add New Curator';
        
        // Create form element
        const form = createCuratorForm(curator);
        
        // Show modal
        UIManager.showModal({
            title,
            content: form,
            buttons: [
                {
                    text: curator ? 'Update' : 'Create',
                    type: 'primary',
                    action: async (button) => {
                        button.disabled = true;
                        button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
                        
                        if (UIManager.validateForm(form)) {
                            const formData = UIManager.getFormValues(form);
                            await saveCurator(formData);
                        } else {
                            button.disabled = false;
                            button.textContent = curator ? 'Update' : 'Create';
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
     * Creates the curator form for the modal
     * @param {Object} curator - Curator data for editing (null for create)
     * @returns {HTMLElement} The form element
     */
    const createCuratorForm = (curator = null) => {
        // Define form schema
        const formSchema = {
            fields: [
                {
                    id: 'id',
                    type: 'hidden',
                    value: curator?.id || ''
                },
                {
                    id: 'name',
                    type: 'text',
                    label: 'Curator Name',
                    placeholder: 'Enter curator name',
                    required: true,
                    errorMessage: 'Curator name is required',
                    value: curator?.name || ''
                },
                {
                    id: 'email',
                    type: 'email',
                    label: 'Email',
                    placeholder: 'Enter curator email',
                    value: curator?.email || ''
                },
                {
                    id: 'notes',
                    type: 'textarea',
                    label: 'Notes',
                    placeholder: 'Enter additional notes about this curator',
                    rows: 3,
                    value: curator?.notes || ''
                }
            ]
        };
        
        return UIManager.createForm(formSchema);
    };
    
    /**
     * Saves a curator (create or update)
     * @param {Object} formData - Form data from the curator form
     */
    const saveCurator = async (formData) => {
        try {
            const restaurantModel = ConciergeData.getEntityModel('restaurant');
            if (!restaurantModel) {
                throw new Error('Restaurant model not found');
            }
            
            // Prepare curator data
            const curatorData = {
                name: formData.name,
                email: formData.email || undefined,
                notes: formData.notes || undefined,
                lastActive: new Date().toISOString()
            };
            
            let result;
            
            // Either update or create
            if (formData.id) {
                curatorData.id = parseInt(formData.id);
                await restaurantModel.curators.update(curatorData);
                result = { id: curatorData.id, isNew: false };
            } else {
                const newId = await restaurantModel.curators.add(curatorData);
                result = { id: newId, isNew: true };
            }
            
            // Refresh data and UI
            await loadInitialData();
            refreshCuratorsTable();
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('appModal'));
            if (modal) {
                modal.hide();
            }
            
            // Show success message
            UIManager.showToast(
                'success',
                'Curator Saved',
                result.isNew 
                    ? `Curator "${formData.name}" created successfully with ID ${result.id}.`
                    : `Curator "${formData.name}" updated successfully.`
            );
            
        } catch (error) {
            console.error('Error saving curator:', error);
            UIManager.showToast('danger', 'Error', `Failed to save curator: ${error.message}`);
            
            // Re-enable save button in case of error
            const modal = document.getElementById('appModal');
            if (modal) {
                const saveButton = modal.querySelector('.btn-primary');
                if (saveButton) {
                    saveButton.disabled = false;
                    saveButton.textContent = formData.id ? 'Update' : 'Create';
                }
            }
        }
    };
    
    /**
     * Opens the curator editor for a specific curator
     * @param {number} id - The curator ID to edit
     */
    const editCurator = async (id) => {
        try {
            const restaurantModel = ConciergeData.getEntityModel('restaurant');
            if (!restaurantModel) {
                throw new Error('Restaurant model not found');
            }
            
            // Get curator data
            const curator = await restaurantModel.curators.getById(id);
            if (!curator) {
                throw new Error(`Curator with ID ${id} not found`);
            }
            
            // Show edit modal
            showCuratorModal(curator);
            
        } catch (error) {
            console.error(`Error editing curator ${id}:`, error);
            UIManager.showToast('danger', 'Error', `Could not load curator: ${error.message}`);
        }
    };
    
    /**
     * Deletes a curator
     * @param {number} id - The curator ID to delete
     */
    const deleteCurator = async (id) => {
        // Show confirmation modal
        UIManager.showModal({
            title: 'Confirm Deletion',
            content: `
                <p>Are you sure you want to delete this curator? This action cannot be undone.</p>
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
                            
                            // Check if curator has restaurants
                            const restaurants = await restaurantModel.restaurants.getAll();
                            const hasRestaurants = restaurants.some(r => r.curatorId === id);
                            
                            if (hasRestaurants) {
                                throw new Error('Cannot delete curator with associated restaurants. Please reassign or delete those restaurants first.');
                            }
                            
                            // Delete the curator
                            await restaurantModel.curators.delete(id);
                            
                            // Refresh data and UI
                            await loadInitialData();
                            refreshCuratorsTable();
                            
                            // Close modal
                            const modal = bootstrap.Modal.getInstance(document.getElementById('appModal'));
                            if (modal) {
                                modal.hide();
                            }
                            
                            UIManager.showToast('success', 'Success', 'Curator deleted successfully.');
                            
                        } catch (error) {
                            console.error(`Error deleting curator ${id}:`, error);
                            UIManager.showToast('danger', 'Error', `Failed to delete curator: ${error.message}`);
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
     * Refreshes the curator table with current state
     */
    const refreshCuratorsTable = () => {
        const tableBody = document.getElementById('curatorsTableBody');
        if (tableBody) {
            tableBody.innerHTML = renderCuratorsTable();
            
            // Update range and total items
            document.getElementById('currentRange').textContent = calculateRange();
            document.getElementById('totalItems').textContent = getFilteredCurators().length;
            
            // Update pagination button states
            const prevBtn = document.getElementById('prevPageBtn');
            const nextBtn = document.getElementById('nextPageBtn');
            
            if (prevBtn) prevBtn.disabled = state.currentPage === 1;
            if (nextBtn) nextBtn.disabled = state.currentPage === state.totalPages;
            
            // Reattach event listeners
            setupEventListeners();
        }
    };
    
    /**
     * Cleanup when leaving the view
     */
    const onExit = () => {
        // Perform any cleanup needed when navigating away
        state.currentPage = 1;
        state.filterText = '';
    };
    
    // Public API
    return {
        initialize,
        onExit,
        editCurator
    };
})();
