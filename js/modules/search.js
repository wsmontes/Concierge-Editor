/**
 * Search Module - Handles searching and filtering of restaurant data
 * Dependencies: RestaurantModule for displaying results, UIModule for notifications
 */

const SearchModule = (function() {
    // Store current search criteria
    let currentSearchCriteria = {
        statuses: ['draft', 'revised', 'production', 'archived']
    };
    
    /**
     * Initialize search functionality
     */
    function init() {
        const globalSearchForm = document.getElementById('global-search');
        
        if (globalSearchForm) {
            globalSearchForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const searchInput = this.querySelector('input[type="search"]');
                if (searchInput && searchInput.value.trim()) {
                    // Perform simple text search
                    applySimpleSearch(searchInput.value.trim());
                }
            });
        }
    }
    
    /**
     * Apply a simple text search across restaurants
     * @param {string} searchTerm - The search term
     */
    function applySimpleSearch(searchTerm) {
        if (!searchTerm) return;
        
        // Navigate to restaurants section
        NavigationModule.navigateTo('restaurants');
        
        // Store search criteria
        currentSearchCriteria = {
            text: searchTerm,
            statuses: ['draft', 'revised', 'production', 'archived']
        };
        
        // Filter restaurants
        filterRestaurants();
        
        // Update UI
        UIModule.showToast(`Searching for "${searchTerm}"`, 'info');
    }
    
    /**
     * Apply advanced search with multiple criteria
     * @param {Object} criteria - Search criteria
     */
    function applyAdvancedSearch(criteria) {
        // Navigate to restaurants section
        NavigationModule.navigateTo('restaurants');
        
        // Update search criteria
        currentSearchCriteria = criteria;
        
        // Filter restaurants
        filterRestaurants();
    }
    
    /**
     * Filter restaurants by concept ID
     * @param {number} conceptId - The concept ID to filter by
     */
    function filterByConcept(conceptId) {
        if (!conceptId) return;
        
        // Store search criteria
        currentSearchCriteria = {
            conceptId: conceptId,
            statuses: ['draft', 'revised', 'production', 'archived']
        };
        
        // Filter restaurants
        filterRestaurants();
        
        // Get concept details
        const concepts = JSON.parse(localStorage.getItem('concepts') || '[]');
        const concept = concepts.find(c => c.id === parseInt(conceptId));
        
        if (concept) {
            UIModule.showToast(`Showing restaurants with concept: ${concept.value}`, 'info');
        }
    }
    
    /**
     * Filter restaurants by status
     * @param {string} status - The status to filter by
     */
    function filterByStatus(status) {
        // Clear other search criteria and only filter by status
        currentSearchCriteria = {
            statuses: [status]
        };
        
        // Filter restaurants
        filterRestaurants();
        
        // Update UI
        UIModule.showToast(`Showing ${status} restaurants`, 'info');
    }
    
    /**
     * Filter restaurants based on current search criteria
     */
    function filterRestaurants() {
        // Get all restaurants
        let restaurants = JSON.parse(localStorage.getItem('restaurants') || '[]');
        const restaurantConcepts = JSON.parse(localStorage.getItem('restaurantConcepts') || '[]');
        const restaurantPhotos = JSON.parse(localStorage.getItem('restaurantPhotos') || '[]');
        const restaurantLocations = JSON.parse(localStorage.getItem('restaurantLocations') || '[]');
        
        // Apply text search if specified
        if (currentSearchCriteria.text) {
            const searchTerm = currentSearchCriteria.text.toLowerCase();
            restaurants = restaurants.filter(restaurant => {
                return (
                    (restaurant.name && restaurant.name.toLowerCase().includes(searchTerm)) ||
                    (restaurant.description && restaurant.description.toLowerCase().includes(searchTerm)) ||
                    (restaurant.transcription && restaurant.transcription.toLowerCase().includes(searchTerm))
                );
            });
        }
        
        // Apply curator filter if specified
        if (currentSearchCriteria.curatorId) {
            const curatorId = parseInt(currentSearchCriteria.curatorId);
            restaurants = restaurants.filter(restaurant => {
                return restaurant.curatorId === curatorId;
            });
        }
        
        // Apply concept filter if specified
        if (currentSearchCriteria.conceptId) {
            const conceptId = parseInt(currentSearchCriteria.conceptId);
            const restaurantIds = restaurantConcepts
                .filter(rc => rc.conceptId === conceptId)
                .map(rc => rc.restaurantId);
            
            restaurants = restaurants.filter(restaurant => {
                return restaurantIds.includes(restaurant.id);
            });
        }
        
        // Apply date range filter if specified
        if (currentSearchCriteria.dateFrom || currentSearchCriteria.dateTo) {
            const fromDate = currentSearchCriteria.dateFrom ? new Date(currentSearchCriteria.dateFrom) : null;
            const toDate = currentSearchCriteria.dateTo ? new Date(currentSearchCriteria.dateTo) : null;
            
            if (fromDate) fromDate.setHours(0, 0, 0, 0);
            if (toDate) toDate.setHours(23, 59, 59, 999);
            
            restaurants = restaurants.filter(restaurant => {
                const itemDate = new Date(restaurant.timestamp);
                
                if (fromDate && toDate) {
                    return itemDate >= fromDate && itemDate <= toDate;
                } else if (fromDate) {
                    return itemDate >= fromDate;
                } else if (toDate) {
                    return itemDate <= toDate;
                }
                
                return true;
            });
        }
        
        // Apply status filter
        if (currentSearchCriteria.statuses && currentSearchCriteria.statuses.length > 0) {
            restaurants = restaurants.filter(restaurant => {
                const status = restaurant.status || 'draft'; // Default to draft
                return currentSearchCriteria.statuses.includes(status);
            });
        }
        
        // Apply content filters if specified
        if (currentSearchCriteria.hasDescription) {
            restaurants = restaurants.filter(restaurant => {
                return restaurant.description && restaurant.description.trim() !== '';
            });
        }
        
        if (currentSearchCriteria.hasTranscription) {
            restaurants = restaurants.filter(restaurant => {
                return restaurant.transcription && restaurant.transcription.trim() !== '';
            });
        }
        
        if (currentSearchCriteria.hasImages) {
            // Get restaurants with images
            const restaurantsWithImages = new Set(
                restaurantPhotos.map(photo => photo.restaurantId)
            );
            
            restaurants = restaurants.filter(restaurant => {
                return restaurantsWithImages.has(restaurant.id);
            });
        }
        
        if (currentSearchCriteria.hasLocation) {
            // Get restaurants with location data
            const restaurantsWithLocations = new Set(
                restaurantLocations.map(location => location.restaurantId)
            );
            
            restaurants = restaurants.filter(restaurant => {
                return restaurantsWithLocations.has(restaurant.id);
            });
        }
        
        // Store filtered results and update UI
        localStorage.setItem('filteredRestaurants', JSON.stringify(restaurants));
        
        // Update restaurant count
        const countElement = document.getElementById('restaurant-count');
        if (countElement) {
            countElement.textContent = `${restaurants.length} restaurant${restaurants.length !== 1 ? 's' : ''}`;
        }
        
        // Update restaurant listings
        if (typeof RestaurantModule.displayFilteredRestaurants === 'function') {
            RestaurantModule.displayFilteredRestaurants(restaurants);
        } else {
            console.warn('RestaurantModule.displayFilteredRestaurants is not available');
        }
    }
    
    /**
     * Reset all search criteria
     */
    function resetSearch() {
        currentSearchCriteria = {
            statuses: ['draft', 'revised', 'production', 'archived']
        };
        
        // Clear search input
        const searchInput = document.querySelector('#global-search input');
        if (searchInput) searchInput.value = '';
        
        // Reset advanced search form
        const advancedSearchForm = document.getElementById('advanced-search-form');
        if (advancedSearchForm) advancedSearchForm.reset();
        
        // Show all restaurants
        filterRestaurants();
        
        // Update UI
        UIModule.showToast('Search filters cleared', 'info');
    }
    
    // Public API
    return {
        init: init,
        applySimpleSearch: applySimpleSearch,
        applyAdvancedSearch: applyAdvancedSearch,
        filterByConcept: filterByConcept,
        filterByStatus: filterByStatus,
        resetSearch: resetSearch
    };
})();
