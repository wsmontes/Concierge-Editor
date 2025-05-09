/**
 * Restaurant Edit Module - Handles restaurant creation and editing functionality
 * Dependencies: ServiceRegistry, UIModule for notifications
 */

const RestaurantEditModule = (function() {
    // Restaurant status constants
    const STATUS = {
        DRAFT: 'draft',
        REVISED: 'revised',
        PRODUCTION: 'production',
        ARCHIVED: 'archived'
    };
    
    // Track current modal and edit state
    let currentModal = null;
    let currentRestaurantId = null;
    let uploadedImages = [];
    let deletedImages = [];
    
    // Service references
    let restaurantService;
    let conceptService;
    let curatorService;
    let imageService;
    let locationService;
    
    /**
     * Initialize restaurant edit functionality
     */
    function init() {
        console.log("RestaurantEditModule initializing...");
        
        // Get service references
        restaurantService = ServiceRegistry.getRestaurantService();
        conceptService = ServiceRegistry.getConceptService();
        curatorService = ServiceRegistry.getCuratorService();
        imageService = ServiceRegistry.getImageService();
        locationService = ServiceRegistry.getLocationService();
        
        // Set up event listeners for global "Add Restaurant" buttons
        setupAddRestaurantButtons();
        
        console.log("RestaurantEditModule initialization complete");
    }
    
    /**
     * Set up event listeners for "Add Restaurant" buttons throughout the app
     */
    function setupAddRestaurantButtons() {
        const addButtons = document.querySelectorAll('#global-add-restaurant, #section-add-restaurant, #empty-add-restaurant');
        
        addButtons.forEach(button => {
            if (button) {
                button.addEventListener('click', function() {
                    showRestaurantEditor();
                });
            }
        });
    }
    
    /**
     * Show restaurant editor form
     * @param {number|null} restaurantId - ID of restaurant to edit, or null for new restaurant
     */
    async function showRestaurantEditor(restaurantId = null) {
        try {
            // Create modal container if it doesn't exist
            let modalContainer = document.getElementById('restaurant-editor-modal');
            if (!modalContainer) {
                modalContainer = document.createElement('div');
                modalContainer.id = 'restaurant-editor-modal';
                modalContainer.className = 'modal-container';
                document.body.appendChild(modalContainer);
            }
            
            // Default restaurant data for new restaurant
            let restaurantData = {
                name: '',
                description: '',
                transcription: '',
                curatorId: '', // Will be populated with the first curator
                status: 'draft'
            };
            
            let selectedConceptIds = [];
            let locationData = null;
            
            // Get all curators and concepts using services
            const curators = await curatorService.getAll();
            const concepts = await conceptService.getAll();
            
            // If editing an existing restaurant, get its data
            if (restaurantId) {
                try {
                    const data = await restaurantService.getWithRelations(restaurantId);
                    restaurantData = data.restaurant;
                    selectedConceptIds = data.conceptIds || [];
                    locationData = data.location;
                } catch (error) {
                    UIModule.showToast('Error loading restaurant data', 'error');
                    console.error(error);
                }
            } else if (curators.length > 0) {
                // Set default curator for new restaurant
                restaurantData.curatorId = curators[0].id;
            }
            
            // Group concepts by category
            const conceptsByCategory = {};
            concepts.forEach(concept => {
                if (!conceptsByCategory[concept.category]) {
                    conceptsByCategory[concept.category] = [];
                }
                conceptsByCategory[concept.category].push(concept);
            });
            
            // Create curator options HTML
            const curatorOptions = curators.map(curator => 
                `<option value="${curator.id}" ${restaurantData.curatorId === curator.id ? 'selected' : ''}>${curator.name}</option>`
            ).join('');
            
            // Create concepts selection HTML
            let conceptsHTML = '';
            Object.entries(conceptsByCategory).forEach(([category, categoryConcepts]) => {
                conceptsHTML += `
                    <div class="concept-category">
                        <h4>${category}</h4>
                        <div class="concept-list">
                            ${categoryConcepts.map(concept => `
                                <label class="concept-checkbox">
                                    <input type="checkbox" name="concepts" value="${concept.id}" 
                                        ${selectedConceptIds.includes(concept.id) ? 'checked' : ''}>
                                    <span>${concept.value}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                `;
            });
            
            // Set modal title based on whether we're editing or creating
            const modalTitle = restaurantId ? 'Edit Restaurant' : 'Create New Restaurant';
            
            // Build modal content
            modalContainer.innerHTML = `
                <div class="modal">
                    <!-- Modal content goes here -->
                    <div class="modal-header">
                        <h3>${modalTitle}</h3>
                        <button class="close-modal"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="modal-body">
                        <!-- Form content goes here -->
                        <form id="restaurant-editor-form">
                            <!-- Tabs and form fields go here -->
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary close-modal">Cancel</button>
                        <button type="button" id="save-restaurant-btn" class="btn btn-primary">Save Restaurant</button>
                    </div>
                </div>
            `;
            
            // Add event listeners and initialize form
            // ...existing form initialization code...
            
            // Form submission handler
            document.getElementById('save-restaurant-btn').addEventListener('click', async function() {
                try {
                    // Validate and collect form data
                    const formData = collectFormData();
                    
                    // Save restaurant
                    let savedRestaurant;
                    if (restaurantId) {
                        savedRestaurant = await restaurantService.update(restaurantId, formData.restaurant);
                    } else {
                        savedRestaurant = await restaurantService.create(formData.restaurant);
                        restaurantId = savedRestaurant.id;
                    }
                    
                    // Save concepts
                    await restaurantService.saveConcepts(restaurantId, formData.conceptIds);
                    
                    // Save location
                    if (formData.location) {
                        await locationService.save(restaurantId, formData.location);
                    }
                    
                    // Save images if any
                    // ...existing image saving code...
                    
                    // Close modal and refresh
                    closeModal();
                    RestaurantModule.updateRestaurantListings();
                    
                } catch (error) {
                    console.error('Error saving restaurant:', error);
                    UIModule.showToast('Error saving restaurant: ' + error.message, 'error');
                }
            });
            
            // Show the modal
            modalContainer.classList.add('active');
        } catch (error) {
            ErrorHandlingService.handleError(error, 'Showing restaurant editor');
            UIModule.showToast('Error initializing restaurant editor', 'error');
        }
    }
    
    /**
     * Collect form data from editor form
     * @return {Object} Object with restaurant, conceptIds, and location data
     */
    function collectFormData() {
        // Implementation of form data collection
        // ...
    }
    
    /**
     * Close the editor modal
     */
    function closeModal() {
        const modal = document.getElementById('restaurant-editor-modal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.remove();
            }, 300);
        }
    }
    
    // Public API
    return {
        init: init,
        showRestaurantEditor: showRestaurantEditor
    };
})();
