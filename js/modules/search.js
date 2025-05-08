/**
 * Search Module - Handles searching and filtering of restaurant data
 * Dependencies: RestaurantModule for displaying results, UIModule for notifications, NavigationModule for page transitions
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
        initGlobalSearch();
        initAdvancedSearch();
        initQuickFilters();
    }
    
    /**
     * Initialize global search functionality
     */
    function initGlobalSearch() {
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
     * Initialize advanced search functionality
     */
    function initAdvancedSearch() {
        const advancedSearchForm = document.getElementById('advanced-search-form');
        const resetSearchBtn = document.getElementById('reset-search');
        
        if (advancedSearchForm) {
            advancedSearchForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                // Collect search criteria
                const searchCriteria = {
                    text: document.getElementById('search-name')?.value || '',
                    curatorId: document.getElementById('search-curator')?.value || '',
                    conceptId: document.getElementById('search-concept')?.value || '',
                    dateFrom: document.getElementById('search-date-from')?.value || '',
                    dateTo: document.getElementById('search-date-to')?.value || '',
                    statuses: Array.from(document.querySelectorAll('input[name="status"]:checked'))
                        .map(el => el.value),
                    hasDescription: document.querySelector('input[name="has_description"]')?.checked || false,
                    hasTranscription: document.querySelector('input[name="has_transcription"]')?.checked || false,
                    hasImages: document.querySelector('input[name="has_images"]')?.checked || false,
                    hasLocation: document.querySelector('input[name="has_location"]')?.checked || false
                };
                
                // Apply advanced search
                applyAdvancedSearch(searchCriteria);
                
                // Close the panel
                document.getElementById('advanced-search-panel')?.classList.remove('active');
            });
        }
        
        if (resetSearchBtn) {
            resetSearchBtn.addEventListener('click', function() {
                resetSearch();
            });
        }
        
        // Toggle advanced search panel
        const advancedSearchBtn = document.getElementById('advanced-search-btn');
        const closeAdvancedSearch = document.querySelector('.close-advanced-search');
        
        if (advancedSearchBtn) {
            advancedSearchBtn.addEventListener('click', function() {
                document.getElementById('advanced-search-panel')?.classList.toggle('active');
            });
        }
        
        if (closeAdvancedSearch) {
            closeAdvancedSearch.addEventListener('click', function() {
                document.getElementById('advanced-search-panel')?.classList.remove('active');
            });
        }
    }
    
    /**
     * Initialize quick filter functionality
     */
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
                    UIModule.showToast('Showing all restaurants', 'info');
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
                    UIModule.showToast(`Filter applied: ${filterLabel}`, 'info');
                }
            });
        }
        
        // Restaurant sort
        const sortSelect = document.getElementById('sort-restaurants');
        if (sortSelect) {
            sortSelect.addEventListener('change', function() {
                // Sorting is handled directly in RestaurantModule
                const sortLabel = this.options[this.selectedIndex].text;
                UIModule.showToast(`Sorted by: ${sortLabel}`, 'info');
                
                // Trigger filter to update restaurant display
                filterRestaurants();
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
        
        // Update UI
        UIModule.showToast('Advanced search applied', 'success');
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
        if (!status) return;
        
        // Navigate to restaurants section
        NavigationModule.navigateTo('restaurants');
        
        // Store search criteria
        currentSearchCriteria = {
            statuses: [status]
        };
        
        // Filter restaurants
        filterRestaurants();
        
        // Update UI with status filter information
        const statusCapitalized = status.charAt(0).toUpperCase() + status.slice(1);
        UIModule.showToast(`Showing ${statusCapitalized} restaurants`, 'info');
        
        // Update status filter dropdown if it exists
        const statusFilter = document.getElementById('status-filter');
        if (statusFilter) {
            statusFilter.value = status;
        }
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
        
        // Apply "no concepts" filter if specified
        if (currentSearchCriteria.noConcepts) {
            const restaurantsWithConcepts = new Set(
                restaurantConcepts.map(rc => rc.restaurantId)
            );
            
            restaurants = restaurants.filter(restaurant => {
                return !restaurantsWithConcepts.has(restaurant.id);
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
        
        // Update restaurant listings via RestaurantModule
        if (typeof RestaurantModule.displayFilteredRestaurants === 'function') {
            RestaurantModule.displayFilteredRestaurants(restaurants);
        } else if (typeof RestaurantModule.updateRestaurantListings === 'function') {
            RestaurantModule.updateRestaurantListings(currentSearchCriteria);
        } else {
            console.warn('RestaurantModule display method is not available');
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
        
        // Reset filter dropdowns
        const filterSelect = document.getElementById('filter-restaurants');
        if (filterSelect) filterSelect.value = 'all';
        
        const statusFilter = document.getElementById('status-filter');
        if (statusFilter) statusFilter.value = 'all';
        
        // Show all restaurants
        filterRestaurants();
        
        // Update UI
        UIModule.showToast('Search filters cleared', 'info');
    }
    
    /**
     * Get selected filter options for UI display
     * @return {Array} Array of active filters for display
     */
    function getActiveFilters() {
        const filters = [];
        
        if (currentSearchCriteria.text) {
            filters.push({ type: 'text', value: currentSearchCriteria.text });
        }
        
        if (currentSearchCriteria.conceptId) {
            // Get concept name
            const concepts = JSON.parse(localStorage.getItem('concepts') || '[]');
            const concept = concepts.find(c => c.id === parseInt(currentSearchCriteria.conceptId));
            if (concept) {
                filters.push({ type: 'concept', value: concept.value });
            }
        }
        
        if (currentSearchCriteria.statuses && currentSearchCriteria.statuses.length > 0 &&
            currentSearchCriteria.statuses.length < 4) { // Not showing if all statuses selected
            filters.push({ type: 'status', value: currentSearchCriteria.statuses.join(', ') });
        }
        
        if (currentSearchCriteria.dateFrom && currentSearchCriteria.dateTo) {
            filters.push({ 
                type: 'dateRange', 
                value: `${formatDate(new Date(currentSearchCriteria.dateFrom))} to ${formatDate(new Date(currentSearchCriteria.dateTo))}`
            });
        } else if (currentSearchCriteria.dateFrom) {
            filters.push({ 
                type: 'dateFrom', 
                value: `After ${formatDate(new Date(currentSearchCriteria.dateFrom))}`
            });
        } else if (currentSearchCriteria.dateTo) {
            filters.push({ 
                type: 'dateTo', 
                value: `Before ${formatDate(new Date(currentSearchCriteria.dateTo))}`
            });
        }
        
        if (currentSearchCriteria.noConcepts) {
            filters.push({ type: 'noConcepts', value: 'No Concepts' });
        }
        
        // Additional content filters
        const contentFilters = [];
        if (currentSearchCriteria.hasDescription) contentFilters.push('Description');
        if (currentSearchCriteria.hasTranscription) contentFilters.push('Transcription');
        if (currentSearchCriteria.hasImages) contentFilters.push('Images');
        if (currentSearchCriteria.hasLocation) contentFilters.push('Location');
        
        if (contentFilters.length > 0) {
            filters.push({ type: 'content', value: `Has: ${contentFilters.join(', ')}` });
        }
        
        return filters;
    }
    
    /**
     * Format a date for display in UI
     * @param {Date} date - The date to format
     * @return {string} - Formatted date string
     */
    function formatDate(date) {
        return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    }
    
    /**
     * Render active filter badges in UI
     * @param {HTMLElement} container - The container to render filters into
     */
    function renderActiveFilters(container) {
        if (!container) return;
        
        const filters = getActiveFilters();
        container.innerHTML = '';
        
        if (filters.length === 0) {
            container.style.display = 'none';
            return;
        }
        
        container.style.display = 'flex';
        
        filters.forEach(filter => {
            const badge = document.createElement('div');
            badge.className = 'filter-badge';
            badge.innerHTML = `
                <span class="filter-text">${filter.value}</span>
                <button class="filter-remove" data-type="${filter.type}">
                    <i class="material-icons">close</i>
                </button>
            `;
            
            const removeBtn = badge.querySelector('.filter-remove');
            if (removeBtn) {
                removeBtn.addEventListener('click', () => {
                    removeFilter(filter.type);
                });
            }
            
            container.appendChild(badge);
        });
        
        // Add clear all button if there are filters
        if (filters.length > 0) {
            const clearButton = document.createElement('button');
            clearButton.className = 'filter-clear-all';
            clearButton.innerHTML = 'Clear All';
            clearButton.addEventListener('click', resetSearch);
            container.appendChild(clearButton);
        }
    }
    
    /**
     * Remove a specific filter
     * @param {string} filterType - The type of filter to remove
     */
    function removeFilter(filterType) {
        switch (filterType) {
            case 'text':
                delete currentSearchCriteria.text;
                const searchInput = document.querySelector('#global-search input');
                if (searchInput) searchInput.value = '';
                break;
                
            case 'concept':
                delete currentSearchCriteria.conceptId;
                break;
                
            case 'status':
                currentSearchCriteria.statuses = ['draft', 'revised', 'production', 'archived'];
                const statusFilter = document.getElementById('status-filter');
                if (statusFilter) statusFilter.value = 'all';
                break;
                
            case 'dateRange':
            case 'dateFrom':
            case 'dateTo':
                delete currentSearchCriteria.dateFrom;
                delete currentSearchCriteria.dateTo;
                break;
                
            case 'noConcepts':
                delete currentSearchCriteria.noConcepts;
                const filterSelect = document.getElementById('filter-restaurants');
                if (filterSelect) filterSelect.value = 'all';
                break;
                
            case 'content':
                // Remove all content filters
                delete currentSearchCriteria.hasDescription;
                delete currentSearchCriteria.hasTranscription;
                delete currentSearchCriteria.hasImages;
                delete currentSearchCriteria.hasLocation;
                break;
        }
        
        // Apply updated filters
        filterRestaurants();
        UIModule.showToast('Filter removed', 'info');
    }
    
    // Public API
    return {
        init: init,
        applySimpleSearch: applySimpleSearch,
        applyAdvancedSearch: applyAdvancedSearch,
        filterByConcept: filterByConcept,
        filterByStatus: filterByStatus,
        resetSearch: resetSearch,
        renderActiveFilters: renderActiveFilters,
        getActiveFilters: getActiveFilters,
        filterRestaurants: filterRestaurants
    };
})();
