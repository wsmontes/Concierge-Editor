/**
 * concepts.js
 * 
 * Purpose: Implements the concepts management view for creating, editing,
 * and organizing restaurant concepts in the CMS.
 * 
 * Dependencies:
 *   - concierge-data.js - For data access
 *   - ui-manager.js - For UI components
 */

const ConceptsView = (() => {
    // View state management
    const state = {
        concepts: [],
        categories: [],
        selectedCategory: null,
        currentPage: 1,
        itemsPerPage: 15,
        totalPages: 1,
        sortField: 'value',
        sortOrder: 'asc',
        filterText: '',
        editingConcept: null
    };
    
    /**
     * Initializes the concepts view
     * @param {HTMLElement} container - The container element to render the view in
     */
    const initialize = async (container) => {
        UIManager.setPageTitle('Concepts');
        
        // Show loading state
        container.innerHTML = '';
        container.appendChild(UIManager.createLoadingSpinner());
        
        try {
            // Load initial data
            await loadInitialData();
            
            // Render the main view
            renderConceptsView(container);
            
            // Set up event listeners
            setupEventListeners();
            
        } catch (error) {
            console.error('Error initializing concepts view:', error);
            container.innerHTML = '';
            container.appendChild(
                UIManager.createPlaceholder(
                    `Error loading concept data: ${error.message}. Please check your connection and try again.`,
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
        
        // Load concepts
        const concepts = await restaurantModel.concepts.getAll();
        
        // Store in state
        state.concepts = concepts;
        
        // Extract unique categories
        state.categories = [...new Set(concepts.map(c => c.category))].sort();
        
        // Calculate total pages
        state.totalPages = Math.ceil(state.concepts.length / state.itemsPerPage) || 1;
    };
    
    /**
     * Renders the main concepts view
     * @param {HTMLElement} container - The container element to render the view in
     */
    const renderConceptsView = (container) => {
        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h1 class="mb-0">Concepts</h1>
                <div class="d-flex gap-2">
                    <button id="addCategoryBtn" class="btn btn-outline-primary">
                        <i class="bi bi-folder-plus"></i> New Category
                    </button>
                    <button id="addConceptBtn" class="btn btn-primary">
                        <i class="bi bi-plus-lg"></i> Add Concept
                    </button>
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-3 mb-4">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="card-title mb-0">Categories</h5>
                        </div>
                        <div class="card-body p-0">
                            <div class="list-group list-group-flush" id="categoriesList">
                                <a href="#" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center ${!state.selectedCategory ? 'active' : ''}" data-category="all">
                                    All Categories
                                    <span class="badge bg-primary rounded-pill">${state.concepts.length}</span>
                                </a>
                                ${renderCategoriesList()}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-9">
                    <div class="card">
                        <div class="card-header">
                            <div class="d-flex justify-content-between align-items-center">
                                <h5 class="card-title mb-0" id="conceptsListTitle">
                                    ${state.selectedCategory ? `Concepts: ${state.selectedCategory}` : 'All Concepts'}
                                </h5>
                                <div class="d-flex gap-2 align-items-center">
                                    <div class="input-group">
                                        <span class="input-group-text">
                                            <i class="bi bi-search"></i>
                                        </span>
                                        <input type="text" id="conceptSearch" class="form-control" placeholder="Search concepts...">
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
                                            <th class="sortable" data-sort="category">Category</th>
                                            <th class="sortable" data-sort="value">Value</th>
                                            <th>Usage</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="conceptsTableBody">
                                        ${renderConceptsTable()}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div class="card-footer">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    Showing <span id="currentRange">${calculateRange()}</span> of <span id="totalItems">${getFilteredConcepts().length}</span> concepts
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
                </div>
            </div>
        `;
    };
    
    /**
     * Renders the categories list
     * @returns {string} HTML string for the categories list
     */
    const renderCategoriesList = () => {
        if (!state.categories || state.categories.length === 0) {
            return `<div class="list-group-item text-muted">No categories found</div>`;
        }
        
        return state.categories.map(category => {
            const count = state.concepts.filter(c => c.category === category).length;
            const isActive = state.selectedCategory === category;
            
            return `
                <a href="#" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center ${isActive ? 'active' : ''}" data-category="${category}">
                    ${category}
                    <span class="badge ${isActive ? 'bg-light text-dark' : 'bg-primary'} rounded-pill">${count}</span>
                </a>
            `;
        }).join('');
    };
    
    /**
     * Gets filtered concepts based on selected category and search text
     * @returns {Array} Filtered concepts
     */
    const getFilteredConcepts = () => {
        let filteredConcepts = state.concepts;
        
        // Filter by category if one is selected
        if (state.selectedCategory) {
            filteredConcepts = filteredConcepts.filter(c => c.category === state.selectedCategory);
        }
        
        // Filter by search text if present
        if (state.filterText) {
            const searchTerm = state.filterText.toLowerCase();
            filteredConcepts = filteredConcepts.filter(c => 
                c.value.toLowerCase().includes(searchTerm) ||
                c.category.toLowerCase().includes(searchTerm)
            );
        }
        
        return filteredConcepts;
    };
    
    /**
     * Calculates the current range of items being displayed
     * @returns {string} Range string (e.g., "1-10")
     */
    const calculateRange = () => {
        const filteredLength = getFilteredConcepts().length;
        const start = (state.currentPage - 1) * state.itemsPerPage + 1;
        const end = Math.min(start + state.itemsPerPage - 1, filteredLength);
        return filteredLength > 0 ? `${start}-${end}` : '0-0';
    };
    
    /**
     * Renders the concepts table rows based on current pagination and sorting
     * @returns {string} HTML string for table rows
     */
    const renderConceptsTable = () => {
        let filteredConcepts = getFilteredConcepts();
        
        if (filteredConcepts.length === 0) {
            return `<tr><td colspan="5" class="text-center">No concepts found</td></tr>`;
        }
        
        // Sort concepts
        const sortedConcepts = [...filteredConcepts].sort((a, b) => {
            const aValue = a[state.sortField];
            const bValue = b[state.sortField];
            
            if (state.sortField === 'value' || state.sortField === 'category') {
                return state.sortOrder === 'asc' 
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue);
            }
            
            return state.sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
        });
        
        // Paginate concepts
        const start = (state.currentPage - 1) * state.itemsPerPage;
        const paginatedConcepts = sortedConcepts.slice(start, start + state.itemsPerPage);
        
        return paginatedConcepts.map(concept => {
            return `
                <tr>
                    <td>${concept.id}</td>
                    <td>
                        <span class="badge bg-secondary">${concept.category}</span>
                    </td>
                    <td>${concept.value}</td>
                    <td>
                        <span class="badge bg-info">---</span>
                    </td>
                    <td>
                        <div class="d-flex gap-2">
                            <button class="btn btn-sm btn-outline-primary edit-concept" data-id="${concept.id}">
                                <i class="bi bi-pencil"></i> Edit
                            </button>
                            <button class="btn btn-sm btn-outline-danger delete-concept" data-id="${concept.id}">
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
        // Add concept button
        document.getElementById('addConceptBtn').addEventListener('click', () => {
            showConceptModal();
        });
        
        // Add category button
        document.getElementById('addCategoryBtn').addEventListener('click', () => {
            showCategoryModal();
        });
        
        // Category selection
        document.querySelectorAll('#categoriesList a').forEach(categoryLink => {
            categoryLink.addEventListener('click', (e) => {
                e.preventDefault();
                const category = categoryLink.dataset.category;
                state.selectedCategory = category === 'all' ? null : category;
                state.currentPage = 1; // Reset to first page when changing category
                refreshConceptsView();
            });
        });
        
        // Pagination buttons
        document.getElementById('prevPageBtn')?.addEventListener('click', () => {
            if (state.currentPage > 1) {
                state.currentPage--;
                refreshConceptsTable();
            }
        });
        
        document.getElementById('nextPageBtn')?.addEventListener('click', () => {
            if (state.currentPage < state.totalPages) {
                state.currentPage++;
                refreshConceptsTable();
            }
        });
        
        // Search field
        document.getElementById('conceptSearch')?.addEventListener('input', (e) => {
            state.filterText = e.target.value.trim();
            state.currentPage = 1; // Reset to first page when searching
            refreshConceptsTable();
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
                
                refreshConceptsTable();
            });
        });
        
        // Edit buttons
        document.querySelectorAll('.edit-concept').forEach(button => {
            button.addEventListener('click', () => {
                const id = parseInt(button.dataset.id);
                editConcept(id);
            });
        });
        
        // Delete buttons
        document.querySelectorAll('.delete-concept').forEach(button => {
            button.addEventListener('click', () => {
                const id = parseInt(button.dataset.id);
                deleteConcept(id);
            });
        });
    };
    
    /**
     * Shows the concept modal for creating or editing
     * @param {Object} concept - Concept data for editing (null for create)
     */
    const showConceptModal = (concept = null) => {
        state.editingConcept = concept;
        
        const title = concept ? 'Edit Concept' : 'Add New Concept';
        
        // Create form element
        const form = createConceptForm(concept);
        
        // Show modal
        UIManager.showModal({
            title,
            content: form,
            buttons: [
                {
                    text: concept ? 'Update' : 'Create',
                    type: 'primary',
                    action: async (button) => {
                        button.disabled = true;
                        button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
                        
                        if (UIManager.validateForm(form)) {
                            const formData = UIManager.getFormValues(form);
                            await saveConcept(formData);
                        } else {
                            button.disabled = false;
                            button.textContent = concept ? 'Update' : 'Create';
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
     * Shows the modal for adding a new category
     */
    const showCategoryModal = () => {
        // Create form element with just a category field
        const formSchema = {
            fields: [
                {
                    id: 'category',
                    type: 'text',
                    label: 'Category Name',
                    placeholder: 'Enter new category name',
                    required: true,
                    errorMessage: 'Category name is required'
                }
            ]
        };
        
        const form = UIManager.createForm(formSchema);
        
        // Show modal
        UIManager.showModal({
            title: 'Add New Category',
            content: form,
            buttons: [
                {
                    text: 'Create',
                    type: 'primary',
                    action: async (button) => {
                        button.disabled = true;
                        button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Creating...';
                        
                        if (UIManager.validateForm(form)) {
                            const formData = UIManager.getFormValues(form);
                            await createCategory(formData.category);
                        } else {
                            button.disabled = false;
                            button.textContent = 'Create';
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
     * Creates the concept form for the modal
     * @param {Object} concept - Concept data for editing (null for create)
     * @returns {HTMLElement} The form element
     */
    const createConceptForm = (concept = null) => {
        // Define form schema
        const formSchema = {
            fields: [
                {
                    id: 'id',
                    type: 'hidden',
                    value: concept?.id || ''
                },
                {
                    id: 'category',
                    type: 'select',
                    label: 'Category',
                    required: true,
                    errorMessage: 'Please select or create a category',
                    options: [
                        ...state.categories.map(cat => ({
                            value: cat,
                            label: cat
                        })),
                        {
                            value: 'new',
                            label: '+ Create New Category'
                        }
                    ],
                    value: concept?.category || (state.selectedCategory || '')
                },
                {
                    id: 'newCategory',
                    type: 'text',
                    label: 'New Category Name',
                    placeholder: 'Enter new category name',
                    helpText: 'Only needed if "Create New Category" is selected above',
                    value: ''
                },
                {
                    id: 'value',
                    type: 'text',
                    label: 'Concept Value',
                    placeholder: 'Enter concept value',
                    required: true,
                    errorMessage: 'Concept value is required',
                    value: concept?.value || ''
                }
            ]
        };
        
        const form = UIManager.createForm(formSchema);
        
        // Add event listener for category select to show/hide new category field
        const categorySelect = form.querySelector('#category');
        const newCategoryGroup = form.querySelector('#newCategory').closest('.mb-3');
        
        // Initially hide the new category field if not selected
        newCategoryGroup.style.display = categorySelect.value === 'new' ? 'block' : 'none';
        
        categorySelect.addEventListener('change', () => {
            newCategoryGroup.style.display = categorySelect.value === 'new' ? 'block' : 'none';
        });
        
        return form;
    };
    
    /**
     * Creates a new category
     * @param {string} categoryName - The name of the new category
     */
    const createCategory = async (categoryName) => {
        try {
            if (!categoryName) {
                throw new Error('Category name is required');
            }
            
            // Check if category already exists
            if (state.categories.includes(categoryName)) {
                throw new Error(`Category "${categoryName}" already exists`);
            }
            
            // Add category to state
            state.categories.push(categoryName);
            state.categories.sort();
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('appModal'));
            if (modal) {
                modal.hide();
            }
            
            // Update UI
            refreshConceptsView();
            
            // Set the new category as selected
            state.selectedCategory = categoryName;
            
            // Show success message
            UIManager.showToast(
                'success',
                'Category Created',
                `Category "${categoryName}" created successfully. You can now add concepts to this category.`,
                5000
            );
            
        } catch (error) {
            console.error('Error creating category:', error);
            UIManager.showToast('danger', 'Error', `Failed to create category: ${error.message}`);
        }
    };
    
    /**
     * Saves a concept (create or update)
     * @param {Object} formData - Form data from the concept form
     */
    const saveConcept = async (formData) => {
        try {
            const restaurantModel = ConciergeData.getEntityModel('restaurant');
            if (!restaurantModel) {
                throw new Error('Restaurant model not found');
            }
            
            // Determine category (new or existing)
            let category = formData.category;
            if (category === 'new') {
                if (!formData.newCategory) {
                    throw new Error('New category name is required');
                }
                category = formData.newCategory;
                
                // Add to categories list if it's new
                if (!state.categories.includes(category)) {
                    state.categories.push(category);
                    state.categories.sort();
                }
            }
            
            // Prepare concept data
            const conceptData = {
                category,
                value: formData.value,
                timestamp: new Date().toISOString()
            };
            
            let result;
            
            // Either update or create
            if (formData.id) {
                conceptData.id = parseInt(formData.id);
                await restaurantModel.concepts.update(conceptData);
                result = { id: conceptData.id, isNew: false };
            } else {
                const newId = await restaurantModel.concepts.add(conceptData);
                result = { id: newId, isNew: true };
                
                // Add new concept to state
                state.concepts.push({ 
                    ...conceptData, 
                    id: newId 
                });
            }
            
            // Refresh data and UI
            await loadInitialData();
            refreshConceptsView();
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('appModal'));
            if (modal) {
                modal.hide();
            }
            
            // Show success message
            UIManager.showToast(
                'success',
                'Concept Saved',
                result.isNew 
                    ? `Concept "${formData.value}" created successfully in category "${category}".`
                    : `Concept "${formData.value}" updated successfully.`
            );
            
        } catch (error) {
            console.error('Error saving concept:', error);
            UIManager.showToast('danger', 'Error', `Failed to save concept: ${error.message}`);
            
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
     * Opens the concept editor for a specific concept
     * @param {number} id - The concept ID to edit
     */
    const editConcept = async (id) => {
        try {
            const restaurantModel = ConciergeData.getEntityModel('restaurant');
            if (!restaurantModel) {
                throw new Error('Restaurant model not found');
            }
            
            // Get concept data
            const concept = await restaurantModel.concepts.getById(id);
            if (!concept) {
                throw new Error(`Concept with ID ${id} not found`);
            }
            
            // Show edit modal
            showConceptModal(concept);
            
        } catch (error) {
            console.error(`Error editing concept ${id}:`, error);
            UIManager.showToast('danger', 'Error', `Could not load concept: ${error.message}`);
        }
    };
    
    /**
     * Shows concept details in a modal
     * @param {number} id - The concept ID to view
     */
    const viewConceptDetails = async (id) => {
        try {
            const restaurantModel = ConciergeData.getEntityModel('restaurant');
            if (!restaurantModel) {
                throw new Error('Restaurant model not found');
            }
            
            // Get concept data
            const concept = await restaurantModel.concepts.getById(id);
            if (!concept) {
                throw new Error(`Concept with ID ${id} not found`);
            }
            
            // Show details modal
            UIManager.showModal({
                title: 'Concept Details',
                content: `
                    <div class="concept-details">
                        <div class="mb-3">
                            <strong>ID:</strong> ${concept.id}
                        </div>
                        <div class="mb-3">
                            <strong>Category:</strong> 
                            <span class="badge bg-secondary">${concept.category}</span>
                        </div>
                        <div class="mb-3">
                            <strong>Value:</strong> ${concept.value}
                        </div>
                        <div class="mb-3">
                            <strong>Created:</strong> ${new Date(concept.timestamp).toLocaleString()}
                        </div>
                    </div>
                `,
                buttons: [
                    {
                        text: 'Edit',
                        type: 'primary',
                        action: () => {
                            const modal = bootstrap.Modal.getInstance(document.getElementById('appModal'));
                            if (modal) {
                                modal.hide();
                                setTimeout(() => {
                                    editConcept(id);
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
            console.error(`Error viewing concept details ${id}:`, error);
            UIManager.showToast('danger', 'Error', `Could not load concept details: ${error.message}`);
        }
    };
    
    /**
     * Deletes a concept
     * @param {number} id - The concept ID to delete
     */
    const deleteConcept = async (id) => {
        // Show confirmation modal
        UIManager.showModal({
            title: 'Confirm Deletion',
            content: `
                <p>Are you sure you want to delete this concept? This action cannot be undone.</p>
                <p class="text-danger"><strong>Warning:</strong> This may affect restaurants using this concept.</p>
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
                            
                            // Check if concept has relations
                            const concept = await restaurantModel.concepts.getById(id);
                            if (!concept) {
                                throw new Error(`Concept with ID ${id} not found`);
                            }
                            
                            // Delete the concept
                            await restaurantModel.concepts.delete(id);
                            
                            // Refresh data and UI
                            await loadInitialData();
                            refreshConceptsView();
                            
                            // Close modal
                            const modal = bootstrap.Modal.getInstance(document.getElementById('appModal'));
                            if (modal) {
                                modal.hide();
                            }
                            
                            UIManager.showToast('success', 'Success', 'Concept deleted successfully.');
                            
                        } catch (error) {
                            console.error(`Error deleting concept ${id}:`, error);
                            UIManager.showToast('danger', 'Error', `Failed to delete concept: ${error.message}`);
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
     * Refreshes the concepts view with current state
     */
    const refreshConceptsView = () => {
        const container = document.getElementById('viewContainer');
        if (container) {
            renderConceptsView(container);
            setupEventListeners();
        }
    };
    
    /**
     * Refreshes just the concepts table with current state
     */
    const refreshConceptsTable = () => {
        // Update table content
        const tableBody = document.getElementById('conceptsTableBody');
        const titleElement = document.getElementById('conceptsListTitle');
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
        
        if (tableBody) {
            tableBody.innerHTML = renderConceptsTable();
            
            // Update range and total items
            document.getElementById('currentRange').textContent = calculateRange();
            document.getElementById('totalItems').textContent = getFilteredConcepts().length;
            
            // Update title
            if (titleElement) {
                titleElement.textContent = state.selectedCategory 
                    ? `Concepts: ${state.selectedCategory}` 
                    : 'All Concepts';
            }
            
            // Update pagination button states
            if (prevBtn) prevBtn.disabled = state.currentPage === 1;
            if (nextBtn) nextBtn.disabled = state.currentPage === state.totalPages;
            
            // Reattach event listeners for the buttons in the table
            setupEventListeners();
        }
    };
    
    /**
     * Cleanup when leaving the view
     */
    const onExit = () => {
        // Perform any cleanup needed when navigating away
        state.selectedCategory = null;
        state.currentPage = 1;
        state.filterText = '';
    };
    
    // Public API
    return {
        initialize,
        onExit,
        viewConceptDetails
    };
})();
