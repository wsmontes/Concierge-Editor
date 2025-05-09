/**
 * Main Application Script - Application initialization and bootstrap
 * Dependencies: ServiceRegistry, StorageModule, and UI modules
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the application
    initApp();
});

/**
 * Initialize the application
 */
async function initApp() {
    try {
        console.log('Initializing application...');
        
        // Initialize UI components that don't need data
        initUIComponents();
        
        // Initialize storage and services
        await StorageModule.initDatabase();
        console.log('Storage initialized');
        await ServiceRegistry.initServices();
        
        // Initialize data-dependent modules
        initDataDependentModules();
        
        // Update application statistics
        updateAppStats();
        
        // Show initialization complete message
        console.log('Application initialized successfully');
        
    } catch (error) {
        console.error('Error initializing application:', error);
        showInitializationError(error);
    }
}

/**
 * Initialize UI components that don't depend on data
 */
function initUIComponents() {
    // Initialize UI modules
    if (typeof SidebarModule !== 'undefined') SidebarModule.init();
    if (typeof NavigationModule !== 'undefined') NavigationModule.init();
    
    // Setup event delegation for common UI components
    setupUIEventDelegation();
}

/**
 * Initialize modules that depend on data
 */
function initDataDependentModules() {
    // Initialize feature modules
    if (typeof RestaurantModule !== 'undefined') RestaurantModule.init();
    if (typeof ConceptModule !== 'undefined') ConceptModule.init();
    if (typeof DashboardModule !== 'undefined') DashboardModule.init();
    if (typeof GalleryModule !== 'undefined') GalleryModule.init();
    if (typeof ImportExportModule !== 'undefined') ImportExportModule.init();
    if (typeof RestaurantEditModule !== 'undefined') RestaurantEditModule.init();
    if (typeof SearchModule !== 'undefined') SearchModule.init();
    if (typeof FormControlsModule !== 'undefined') FormControlsModule.init();
}

/**
 * Update application statistics - used by dashboard and other components
 */
async function updateAppStats() {
    try {
        // Get required services
        const restaurantService = ServiceRegistry.getRestaurantService();
        const conceptService = ServiceRegistry.getConceptService();
        const storageService = ServiceRegistry.getStorageService();
        
        // Get database statistics
        const dbStats = await storageService.getDatabaseStats();
        
        // Update any stats displays if they exist
        const totalRestaurantCount = document.getElementById('total-restaurant-count');
        if (totalRestaurantCount) {
            const totalCount = await restaurantService.count();
            totalRestaurantCount.textContent = totalCount;
        }
        
        const conceptCount = document.getElementById('total-concept-count');
        if (conceptCount) {
            const totalConcepts = await conceptService.count();
            conceptCount.textContent = totalConcepts;
        }
        
        // Update dashboard if it's available and initialized
        if (typeof DashboardModule !== 'undefined' && typeof DashboardModule.refreshDashboard === 'function') {
            DashboardModule.refreshDashboard();
        }
    } catch (error) {
        console.error('Error updating application statistics:', error);
    }
}

/**
 * Setup event delegation for common UI components
 */
function setupUIEventDelegation() {
    // Add event delegation for common UI interactions
    document.body.addEventListener('click', function(event) {
        // Handle toast close buttons
        if (event.target.classList.contains('close-toast') || 
            event.target.parentElement?.classList.contains('close-toast')) {
            const toast = event.target.closest('.toast');
            if (toast) toast.remove();
        }
        
        // Handle modal close buttons 
        if (event.target.classList.contains('close-modal') || 
            event.target.parentElement?.classList.contains('close-modal')) {
            const modal = event.target.closest('.modal-container');
            if (modal) {
                modal.classList.remove('active');
                setTimeout(() => modal.remove(), 300);
            }
        }
    });
}

/**
 * Show error message when initialization fails
 * @param {Error} error - The error that occurred
 */
function showInitializationError(error) {
    // Create and show an error message to the user
    const errorContainer = document.createElement('div');
    errorContainer.className = 'initialization-error';
    errorContainer.innerHTML = `
        <div class="error-content">
            <h2>Application Initialization Error</h2>
            <p>There was a problem initializing the application:</p>
            <div class="error-message">${error.message}</div>
            <button class="btn btn-primary retry-button">Retry</button>
        </div>
    `;
    
    // Add retry functionality
    const retryButton = errorContainer.querySelector('.retry-button');
    if (retryButton) {
        retryButton.addEventListener('click', function() {
            errorContainer.remove();
            initApp();
        });
    }
    
    document.body.appendChild(errorContainer);
}
