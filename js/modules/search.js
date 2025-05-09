/**
 * Search Module - Handles searching and filtering of restaurant data
 * Dependencies: ServiceRegistry, UIUtils, RestaurantService
 */

const SearchModule = (function() {
    // Current search criteria state
    let currentSearchCriteria = {
        statuses: ['draft', 'revised', 'production', 'archived']
    };
    
    /**
     * Initialize search module
     */
    function init() {
        initQuickFilters();
    }
    
    function initQuickFilters() {
        // Filter by status
        const statusFilter = document.getElementById('status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', function() {
                const status = this.value;
                if (status !== 'all') {
                    filterByStatus(status);
                } else {
                    // Show all statuses
                    currentSearchCriteria = {
                        statuses: ['draft', 'revised', 'production', 'archived']
                    };
                    filterRestaurants();
                    UIUtils.showNotification('Showing all restaurants', 'info');
                }
            });
        }
        
        // Filter by restaurant type
        const restaurantFilter = document.getElementById('filter-restaurants');
        if (restaurantFilter) {
            restaurantFilter.addEventListener('change', function() {
                const filterValue = this.value;
                
                // Update current search criteria
                if (filterValue === 'no-concepts') {
                    currentSearchCriteria.noConcepts = true;
                } else if (filterValue === 'new') {
                    const oneWeekAgo = new Date();
                    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                    currentSearchCriteria.dateFrom = oneWeekAgo.toISOString().split('T')[0];
                } else {
                    // Reset these specific filters
                    delete currentSearchCriteria.noConcepts;
                    delete currentSearchCriteria.dateFrom;
                }
                
                // Update display
                filterRestaurants();
                
                // Notify user
                if (filterValue !== 'all') {
                    const filterLabel = this.options[this.selectedIndex].text;
                    UIUtils.showNotification(`Filter applied: ${filterLabel}`, 'info');
                }
            });
        }
        
        // Restaurant sort
        const sortSelect = document.getElementById('sort-restaurants');
        if (sortSelect) {
            sortSelect.addEventListener('change', function() {
                // Sorting is handled directly in RestaurantModule
                const sortLabel = this.options[this.selectedIndex].text;
                UIUtils.showNotification(`Sorted by: ${sortLabel}`, 'info');
                
                // Trigger filter to update restaurant display
                filterRestaurants();
            });
        }
    }
    
    /**
     * Filter restaurants by status
     * @param {string} status - The status to filter by
     */
    function filterByStatus(status) {
        // Update search criteria to only include the selected status
        currentSearchCriteria.statuses = [status];
        
        // Apply the filter
        filterRestaurants();
        
        // Show notification
        UIUtils.showNotification(`Showing ${status} restaurants`, 'info');
    }
    
    /**
     * Filter restaurants based on current search criteria
     */
    function filterRestaurants() {
        if (typeof RestaurantModule !== 'undefined' && RestaurantModule.updateRestaurantListings) {
            RestaurantModule.updateRestaurantListings(currentSearchCriteria);
        }
    }
    
    /**
     * Apply advanced search criteria
     * @param {Object} criteria - Search criteria object
     */
    function applyAdvancedSearch(criteria) {
        // Update current search criteria with new values
        currentSearchCriteria = { ...criteria };
        
        // Apply the filter
        filterRestaurants();
    }
    
    /**
     * Filter restaurants by concept ID
     * @param {string|number} conceptId - The concept ID to filter by
     */
    async function filterByConcept(conceptId) {
        try {
            // Get concept service
            const conceptService = ServiceRegistry.getConceptService();
            
            // Get concept details for display
            const concepts = await conceptService.getAll();
            const concept = concepts.find(c => c.id == conceptId);
            const conceptName = concept ? concept.value : 'Unknown concept';
            
            // Update search criteria to filter by concept
            currentSearchCriteria = {
                conceptId: conceptId,
                statuses: ['draft', 'revised', 'production', 'archived']
            };
            
            // Apply the filter
            filterRestaurants();
            
            // Update UI if search concept dropdown exists
            const conceptSelect = document.getElementById('search-concept');
            if (conceptSelect) conceptSelect.value = conceptId;
            
            // Show notification
            UIUtils.showNotification(`Showing restaurants with concept: ${conceptName}`, 'info');
        } catch (error) {
            ErrorHandlingService.handleError(error, 'Filtering by concept');
            UIUtils.showNotification('Error filtering by concept', 'error');
        }
    }
    
    /**
     * Reset all search filters to default values
     */
    function resetFilters() {
        // Reset to default search criteria
        currentSearchCriteria = {
            statuses: ['draft', 'revised', 'production', 'archived']
        };
        
        // Reset form elements if they exist
        const advancedSearchForm = document.getElementById('advanced-search-form');
        if (advancedSearchForm) advancedSearchForm.reset();
        
        // Reset filter dropdowns
        const statusFilter = document.getElementById('status-filter');
        if (statusFilter) statusFilter.value = 'all';
        
        const restaurantFilter = document.getElementById('filter-restaurants');
        if (restaurantFilter) restaurantFilter.value = 'all';
        
        // Update display
        filterRestaurants();
        
        // Show notification
        UIUtils.showNotification('Search filters have been reset', 'info');
    }
    
    // Public API
    return {
        init,
        filterByStatus,
        filterByConcept,
        applyAdvancedSearch,
        resetFilters
    };
})();
