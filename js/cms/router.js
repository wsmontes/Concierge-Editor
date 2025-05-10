/**
 * router.js
 * 
 * Purpose: Handles navigation between application views.
 * Manages view transitions and view handlers.
 * 
 * Dependencies: view-handler modules
 */

const Router = (() => {
    // Route definitions with their corresponding view handlers
    const routes = {
        dashboard: {
            title: 'Dashboard',
            handler: DashboardView
        },
        restaurants: {
            title: 'Restaurants',
            handler: RestaurantsView
        },
        concepts: {
            title: 'Concepts',
            handler: ConceptsView
        },
        curators: {
            title: 'Curators',
            handler: CuratorsView
        },
        locations: {
            title: 'Locations',
            handler: LocationsView
        },
        photos: {
            title: 'Photo Gallery',
            handler: PhotosView
        },
        'import-export': {
            title: 'Import/Export',
            handler: ImportExportView
        }
    };
    
    // Current view state
    let currentView = null;
    let currentHandler = null;

    /**
     * Initializes the router
     */
    const initialize = () => {
        // Handle browser back/forward navigation
        window.addEventListener('popstate', handlePopState);
    };

    /**
     * Handles browser history navigation
     * @param {PopStateEvent} event History event
     */
    const handlePopState = (event) => {
        if (event.state && event.state.view) {
            navigateTo(event.state.view, false);
        }
    };

    /**
     * Navigates to a specific view
     * @param {string} viewName Name of the view to navigate to
     * @param {boolean} pushState Whether to push state to browser history
     */
    const navigateTo = (viewName, pushState = true) => {
        // Check if view exists
        if (!routes[viewName]) {
            console.error(`View not found: ${viewName}`);
            viewName = 'dashboard'; // Fallback to dashboard
        }
        
        // Get view container
        const viewContainer = document.getElementById('viewContainer');
        
        // Clean up current view if needed
        if (currentHandler && typeof currentHandler.onExit === 'function') {
            currentHandler.onExit();
        }
        
        // Set new view
        currentView = viewName;
        currentHandler = routes[viewName].handler;
        
        // Update page title
        UIManager.setPageTitle(routes[viewName].title);
        
        // Show loading state
        viewContainer.innerHTML = '';
        viewContainer.appendChild(UIManager.createLoadingSpinner());
        
        // Update browser history if requested
        if (pushState) {
            window.history.pushState({ view: viewName }, '', `#${viewName}`);
        }
        
        // Load view
        setTimeout(() => {
            viewContainer.innerHTML = '';
            
            // Initialize view
            if (typeof currentHandler.initialize === 'function') {
                currentHandler.initialize(viewContainer);
            } else {
                viewContainer.innerHTML = `<h1>${routes[viewName].title}</h1><p>View content not implemented.</p>`;
            }
        }, 300); // Small delay to show loading effect
    };

    /**
     * Gets the current view name
     * @returns {string} Current view name
     */
    const getCurrentView = () => currentView;

    return {
        initialize,
        navigateTo,
        getCurrentView
    };
})();
