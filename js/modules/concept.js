/**
 * Concept Module - Handles concept management functionality
 * Dependencies: ServiceRegistry, UIUtils, ErrorHandlingService, ValidationService
 * Provides UI for managing concepts
 */

const ConceptModule = (function() {
    // Track current filter state
    let currentCategoryFilter = 'all';
    let currentSearchTerm = '';
    
    /**
     * Initialize concept management functionality
     */
    function init() {
        const conceptsSection = document.getElementById('concepts');
        if (!conceptsSection) return;
        
        // Handle adding new concepts
        const addConceptForm = document.getElementById('add-concept-form');
        if (addConceptForm) {
            addConceptForm.addEventListener('submit', function(e) {
                e.preventDefault();
                const category = document.getElementById('concept-category').value.trim();
                const value = document.getElementById('concept-value').value.trim();
                
                if (category && value) {
                    addNewConcept(category, value);
                } else {
                    UIUtils.showNotification('Please provide both category and value', 'error');
                }
            });
        }
        
        // Initialize category filter
        const categoryFilter = document.getElementById('concept-category-filter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', function() {
                currentCategoryFilter = this.value;
                updateConceptsList(currentCategoryFilter, currentSearchTerm);
            });
        }
        
        // Initialize search filter
        const searchInput = document.getElementById('concept-search');
        if (searchInput) {
            searchInput.addEventListener('input', function() {
                currentSearchTerm = this.value.trim().toLowerCase();
                updateConceptsList(currentCategoryFilter, currentSearchTerm);
            });
        }
        
        // Load and display concepts
        updateConceptsList();
        
        // Populate category filter dropdown
        populateCategoryFilter();
    }

    /**
     * Update the list of concepts displayed in the UI
     * @param {string} categoryFilter - Category to filter by (or 'all')
     * @param {string} searchTerm - Text to search for
     */
    async function updateConceptsList(categoryFilter = 'all', searchTerm = '') {
        const conceptList = document.getElementById('concept-list');
        if (!conceptList) return;
        
        try {
            // Add loading state
            conceptList.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Loading concepts...</div>';
            
            // Get concept service
            const conceptService = ServiceRegistry.getConceptService();
            
            // Get concepts and usage stats
            const conceptStats = await conceptService.getConceptUsageStats();
            let concepts = await conceptService.getAll();
            
            // Apply category filter
            if (categoryFilter && categoryFilter !== 'all') {
                concepts = concepts.filter(concept => concept.category === categoryFilter);
            }
            
            // Apply search filter
            if (searchTerm) {
                concepts = concepts.filter(concept => 
                    concept.value.toLowerCase().includes(searchTerm) || 
                    concept.category.toLowerCase().includes(searchTerm)
                );
            }
            
            // Clear the list
            conceptList.innerHTML = '';
            
            if (concepts.length === 0) {
                conceptList.innerHTML = '<div class="empty-state">No concepts found</div>';
                return;
            }
            
            // Create lookup for usage counts
            const usageCounts = {};
            conceptStats.forEach(stat => {
                usageCounts[stat.id] = stat.usageCount;
            });
            
            // Sort concepts by category then by value
            concepts.sort((a, b) => {
                if (a.category !== b.category) {
                    return a.category.localeCompare(b.category);
                }
                return a.value.localeCompare(b.value);
            });
            
            // Group concepts by category
            const conceptsByCategory = {};
            concepts.forEach(concept => {
                if (!conceptsByCategory[concept.category]) {
                    conceptsByCategory[concept.category] = [];
                }
                conceptsByCategory[concept.category].push(concept);
            });
            
            // Generate HTML for each category
            Object.entries(conceptsByCategory).forEach(([category, categoryConcepts]) => {
                const categoryGroup = document.createElement('div');
                categoryGroup.className = 'concept-category-group';
                
                categoryGroup.innerHTML = `
                    <div class="category-header">
                        <h3>${category}</h3>
                        <span class="concept-count">${categoryConcepts.length} concepts</span>
                    </div>
                    <div class="concept-items"></div>
                `;
                
                const conceptItems = categoryGroup.querySelector('.concept-items');
                
                // Add each concept to the category
                categoryConcepts.forEach(concept => {
                    const useCount = usageCounts[concept.id] || 0;
                    const conceptItem = document.createElement('div');
                    conceptItem.className = 'concept-item';
                    conceptItem.setAttribute('data-id', concept.id);
                    conceptItem.setAttribute('data-category', concept.category);
                    
                    conceptItem.innerHTML = `
                        <div class="concept-info">
                            <div class="concept-value">${ValidationService.sanitizeString(concept.value)}</div>
                            <div class="concept-meta">
                                <span class="usage-count" title="Used in ${useCount} restaurants">
                                    <i class="fas fa-link"></i> ${useCount}
                                </span>
                                <span class="timestamp" title="Added on ${new Date(concept.timestamp).toLocaleDateString()}">
                                    <i class="fas fa-calendar-alt"></i> ${formatDate(new Date(concept.timestamp))}
                                </span>
                            </div>
                        </div>
                        <div class="concept-actions">
                            <button class="btn btn-icon edit-concept" title="Edit Concept">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-icon delete-concept" title="Delete Concept">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    `;
                    
                    // Add event listeners
                    const editBtn = conceptItem.querySelector('.edit-concept');
                    if (editBtn) {
                        editBtn.addEventListener('click', () => editConcept(concept.id));
                    }
                    
                    const deleteBtn = conceptItem.querySelector('.delete-concept');
                    if (deleteBtn) {
                        deleteBtn.addEventListener('click', () => {
                            if (useCount > 0) {
                                UIUtils.showConfirmation(
                                    `This concept is used in ${useCount} restaurants. Are you sure you want to delete it?`,
                                    { 
                                        title: 'Delete Concept',
                                        confirmText: 'Delete',
                                        confirmClass: 'btn-danger'
                                    }
                                ).then(confirmed => {
                                    if (confirmed) {
                                        deleteConcept(concept.id);
                                    }
                                });
                            } else {
                                deleteConcept(concept.id);
                            }
                        });
                    }
                    
                    conceptItems.appendChild(conceptItem);
                });
                
                conceptList.appendChild(categoryGroup);
            });
        } catch (error) {
            ErrorHandlingService.handleError(error, 'Loading concepts list');
            conceptList.innerHTML = '<div class="error-state">Error loading concepts</div>';
            UIUtils.showNotification('Error loading concepts', 'error');
        }
    }
    
    /**
     * Format a date as MM/DD/YYYY
     * @param {Date} date - Date to format
     * @return {string} - Formatted date string
     */
    function formatDate(date) {
        return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    }
    
    /**
     * Populate the category filter dropdown with available categories
     */
    async function populateCategoryFilter() {
        const categoryFilter = document.getElementById('concept-category-filter');
        if (!categoryFilter) return;
        
        try {
            // Get concept service
            const conceptService = ServiceRegistry.getConceptService();
            
            // Get categories
            const categories = await conceptService.getCategories();
            
            // Start with the "All Categories" option
            categoryFilter.innerHTML = '<option value="all">All Categories</option>';
            
            // Add each category as an option
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                categoryFilter.appendChild(option);
            });
        } catch (error) {
            ErrorHandlingService.handleError(error, 'Populating concept categories');
        }
    }

    /**
     * Add a new concept
     * @param {string} category - The concept category
     * @param {string} value - The concept value
     */
    async function addNewConcept(category, value) {
        try {
            // Validate concept using ValidationService
            const conceptData = { category, value };
            const validationResult = ValidationService.validateConcept(conceptData);
            
            if (!validationResult.valid) {
                UIUtils.showNotification(`Validation error: ${validationResult.errors[0]}`, 'error');
                return;
            }
            
            // Get concept service
            const conceptService = ServiceRegistry.getConceptService();
            
            // Check if concept already exists
            const concepts = await conceptService.getAll();
            const existingConcept = concepts.find(c => 
                c.category.toLowerCase() === category.toLowerCase() && 
                c.value.toLowerCase() === value.toLowerCase()
            );
            
            if (existingConcept) {
                UIUtils.showNotification(`Concept "${value}" in category "${category}" already exists`, 'warning');
                return;
            }
            
            // Create new concept
            const newConcept = await conceptService.create({
                category,
                value
            });
            
            // Clear form fields
            document.getElementById('concept-category').value = '';
            document.getElementById('concept-value').value = '';
            
            // Update concept list and filter
            updateConceptsList(currentCategoryFilter, currentSearchTerm);
            populateCategoryFilter();
            
            // Show success message
            UIUtils.showNotification(`Concept "${value}" added successfully`, 'success');
            
            return newConcept;
        } catch (error) {
            ErrorHandlingService.handleError(error, 'Adding concept');
            UIUtils.showNotification('Error adding concept: ' + error.message, 'error');
            throw error;
        }
    }

    /**
     * Edit an existing concept
     * @param {number} conceptId - The ID of the concept to edit
     */
    async function editConcept(conceptId) {
        try {
            // Get concept service
            const conceptService = ServiceRegistry.getConceptService();
            
            // Get concept data
            const concept = await conceptService.getById(conceptId);
            
            if (!concept) {
                UIUtils.showNotification('Concept not found', 'error');
                return;
            }
            
            // Create modal for editing
            const modalContainer = document.createElement('div');
            modalContainer.className = 'modal-container';
            modalContainer.id = 'edit-concept-modal';
            
            modalContainer.innerHTML = `
                <div class="modal">
                    <div class="modal-header">
                        <h3>Edit Concept</h3>
                        <button class="close-modal"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="modal-body">
                        <form id="edit-concept-form">
                            <div class="form-group">
                                <label for="edit-concept-category">Category</label>
                                <input type="text" id="edit-concept-category" value="${ValidationService.sanitizeString(concept.category)}" required>
                            </div>
                            <div class="form-group">
                                <label for="edit-concept-value">Value</label>
                                <input type="text" id="edit-concept-value" value="${ValidationService.sanitizeString(concept.value)}" required>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary close-modal">Cancel</button>
                        <button type="button" id="save-concept-btn" class="btn btn-primary">Save Changes</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modalContainer);
            
            // Show modal
            setTimeout(() => {
                modalContainer.classList.add('active');
            }, 10);
            
            // Add event listeners
            const closeButtons = modalContainer.querySelectorAll('.close-modal');
            closeButtons.forEach(button => {
                button.addEventListener('click', () => {
                    modalContainer.classList.remove('active');
                    setTimeout(() => {
                        modalContainer.remove();
                    }, 300);
                });
            });
            
            // Save button
            const saveButton = modalContainer.querySelector('#save-concept-btn');
            if (saveButton) {
                saveButton.addEventListener('click', async () => {
                    const categoryInput = document.getElementById('edit-concept-category');
                    const valueInput = document.getElementById('edit-concept-value');
                    
                    const newCategory = categoryInput.value.trim();
                    const newValue = valueInput.value.trim();
                    
                    // Validate updated concept
                    const validationResult = ValidationService.validateConcept({
                        category: newCategory,
                        value: newValue
                    });
                    
                    if (!validationResult.valid) {
                        UIUtils.showNotification(`Validation error: ${validationResult.errors[0]}`, 'error');
                        return;
                    }
                    
                    try {
                        // Check for existing duplicate
                        const allConcepts = await conceptService.getAll();
                        const duplicate = allConcepts.find(c => 
                            c.id !== conceptId &&
                            c.category.toLowerCase() === newCategory.toLowerCase() && 
                            c.value.toLowerCase() === newValue.toLowerCase()
                        );
                        
                        if (duplicate) {
                            UIUtils.showNotification(`Concept "${newValue}" in category "${newCategory}" already exists`, 'warning');
                            return;
                        }
                        
                        // Update concept
                        await conceptService.update(conceptId, {
                            category: newCategory,
                            value: newValue
                        });
                        
                        // Close modal
                        modalContainer.classList.remove('active');
                        setTimeout(() => {
                            modalContainer.remove();
                        }, 300);
                        
                        // Update concept list and filter
                        updateConceptsList(currentCategoryFilter, currentSearchTerm);
                        populateCategoryFilter();
                        
                        // Show success message
                        UIUtils.showNotification(`Concept updated successfully`, 'success');
                    } catch (error) {
                        ErrorHandlingService.handleError(error, 'Updating concept');
                        UIUtils.showNotification('Error updating concept: ' + error.message, 'error');
                    }
                });
            }
        } catch (error) {
            ErrorHandlingService.handleError(error, 'Editing concept');
            UIUtils.showNotification('Error editing concept', 'error');
        }
    }

    /**
     * Delete a concept
     * @param {number} conceptId - The ID of the concept to delete
     */
    async function deleteConcept(conceptId) {
        try {
            // Get concept service
            const conceptService = ServiceRegistry.getConceptService();
            
            // Get concept before deletion to show success message with name
            const concept = await conceptService.getById(conceptId);
            
            if (!concept) {
                UIUtils.showNotification('Concept not found', 'error');
                return;
            }
            
            // Delete concept
            await conceptService.delete(conceptId);
            
            // Update concept list and filter
            updateConceptsList(currentCategoryFilter, currentSearchTerm);
            populateCategoryFilter();
            
            // Show success message
            UIUtils.showNotification(`Concept "${concept.value}" deleted successfully`, 'success');
            
        } catch (error) {
            ErrorHandlingService.handleError(error, 'Deleting concept');
            UIUtils.showNotification('Error deleting concept: ' + error.message, 'error');
        }
    }
    
    /**
     * Get all concepts by category
     * @returns {Promise<Object>} - Object with categories as keys and arrays of concepts as values
     */
    async function getAllConceptsByCategory() {
        try {
            const conceptService = ServiceRegistry.getConceptService();
            return await conceptService.getConceptsByCategory();
        } catch (error) {
            ErrorHandlingService.handleError(error, 'Getting concepts by category');
            return {};
        }
    }
    
    /**
     * Get popular concepts based on usage
     * @param {number} limit - Maximum number of concepts to return
     * @returns {Promise<Array>} - Array of concepts with usage counts
     */
    async function getPopularConcepts(limit = 10) {
        try {
            const conceptService = ServiceRegistry.getConceptService();
            const conceptStats = await conceptService.getConceptUsageStats();
            
            // Sort by usage count (descending) and limit results
            return conceptStats
                .sort((a, b) => b.usageCount - a.usageCount)
                .slice(0, limit);
        } catch (error) {
            ErrorHandlingService.handleError(error, 'Getting popular concepts');
            return [];
        }
    }

    // Public API
    return {
        init,
        updateConceptsList,
        addNewConcept,
        editConcept,
        deleteConcept,
        getAllConceptsByCategory,
        getPopularConcepts,
        populateCategoryFilter
    };
})();
