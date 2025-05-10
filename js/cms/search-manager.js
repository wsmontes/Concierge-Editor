/**
 * search-manager.js
 * 
 * Purpose: Manages global search functionality across the application.
 * Searches across different entity types and displays results.
 * 
 * Dependencies: 
 *   - concierge-data.js - For database queries
 */

const SearchManager = (() => {
    // Search state
    let searchTimeout = null;
    let lastQuery = '';
    
    /**
     * Initializes the search functionality
     */
    const initialize = () => {
        const searchInput = document.getElementById('globalSearch');
        const searchResults = document.getElementById('searchResults');
        
        // Handle search input
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            
            // Clear previous timeout
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }
            
            // Hide results if empty
            if (!query) {
                searchResults.classList.add('d-none');
                searchResults.innerHTML = '';
                lastQuery = '';
                return;
            }
            
            // Debounce search
            searchTimeout = setTimeout(() => {
                if (query !== lastQuery) {
                    lastQuery = query;
                    performSearch(query);
                }
            }, 300);
        });
        
        // Close search results when clicking outside
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
                searchResults.classList.add('d-none');
            }
        });
        
        // Focus search input with keyboard shortcut
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                searchInput.focus();
            }
            
            // Close search with escape
            if (e.key === 'Escape' && !searchResults.classList.contains('d-none')) {
                searchResults.classList.add('d-none');
                searchInput.blur();
            }
        });
    };

    /**
     * Performs a global search across entities
     * @param {string} query Search query
     */
    const performSearch = async (query) => {
        if (!ConciergeData.getDatabase().db) {
            showNoResultsMessage('Database not connected. Please initialize the database first.');
            return;
        }
        
        const searchResults = document.getElementById('searchResults');
        searchResults.innerHTML = '<div class="p-3 text-center"><div class="spinner-border spinner-border-sm text-primary" role="status"></div><div class="mt-2">Searching...</div></div>';
        searchResults.classList.remove('d-none');
        
        try {
            // Get entity model
            const restaurantModel = ConciergeData.getEntityModel('restaurant');
            if (!restaurantModel) {
                throw new Error('Restaurant model not found');
            }
            
            // Perform searches in parallel
            const [restaurants, concepts, curators, locations] = await Promise.all([
                searchRestaurants(restaurantModel, query),
                searchConcepts(restaurantModel, query),
                searchCurators(restaurantModel, query),
                searchLocations(restaurantModel, query)
            ]);
            
            // Combine and display results
            displaySearchResults({
                restaurants,
                concepts,
                curators,
                locations
            });
        } catch (error) {
            console.error('Search error:', error);
            showNoResultsMessage(`Search error: ${error.message}`);
        }
    };

    /**
     * Searches for restaurants matching the query
     * @param {Object} model Restaurant model
     * @param {string} query Search query
     * @returns {Array} Matching restaurants
     */
    const searchRestaurants = async (model, query) => {
        const allRestaurants = await model.restaurants.getAll();
        const lowerQuery = query.toLowerCase();
        
        return allRestaurants
            .filter(restaurant => 
                restaurant.name.toLowerCase().includes(lowerQuery) ||
                (restaurant.description && restaurant.description.toLowerCase().includes(lowerQuery))
            )
            .slice(0, 5); // Limit to 5 results
    };

    /**
     * Searches for concepts matching the query
     * @param {Object} model Restaurant model
     * @param {string} query Search query
     * @returns {Array} Matching concepts
     */
    const searchConcepts = async (model, query) => {
        const allConcepts = await model.concepts.getAll();
        const lowerQuery = query.toLowerCase();
        
        return allConcepts
            .filter(concept => 
                concept.category.toLowerCase().includes(lowerQuery) ||
                concept.value.toLowerCase().includes(lowerQuery)
            )
            .slice(0, 5); // Limit to 5 results
    };

    /**
     * Searches for curators matching the query
     * @param {Object} model Restaurant model
     * @param {string} query Search query
     * @returns {Array} Matching curators
     */
    const searchCurators = async (model, query) => {
        const allCurators = await model.curators.getAll();
        const lowerQuery = query.toLowerCase();
        
        return allCurators
            .filter(curator => 
                curator.name.toLowerCase().includes(lowerQuery)
            )
            .slice(0, 3); // Limit to 3 results
    };

    /**
     * Searches for locations matching the query
     * @param {Object} model Restaurant model
     * @param {string} query Search query
     * @returns {Array} Matching locations
     */
    const searchLocations = async (model, query) => {
        const allLocations = await model.restaurantLocations.getAll();
        const lowerQuery = query.toLowerCase();
        
        // Get restaurants to include restaurant names
        const restaurants = await model.restaurants.getAll();
        const restaurantMap = {};
        restaurants.forEach(restaurant => {
            restaurantMap[restaurant.id] = restaurant;
        });
        
        return allLocations
            .filter(location => 
                (location.address && location.address.toLowerCase().includes(lowerQuery)) ||
                (location.city && location.city.toLowerCase().includes(lowerQuery)) ||
                (location.state && location.state.toLowerCase().includes(lowerQuery)) ||
                (location.zipCode && location.zipCode.toLowerCase().includes(lowerQuery))
            )
            .map(location => ({
                ...location,
                restaurantName: restaurantMap[location.restaurantId] ? restaurantMap[location.restaurantId].name : 'Unknown Restaurant'
            }))
            .slice(0, 5); // Limit to 5 results
    };

    /**
     * Displays search results in the dropdown
     * @param {Object} results Search results grouped by category
     */
    const displaySearchResults = (results) => {
        const searchResults = document.getElementById('searchResults');
        
        // Check if we have any results
        const totalResults = 
            results.restaurants.length +
            results.concepts.length +
            results.curators.length +
            results.locations.length;
            
        if (totalResults === 0) {
            showNoResultsMessage('No matching results found.');
            return;
        }
        
        // Build results HTML
        let html = '';
        
        // Restaurants
        if (results.restaurants.length > 0) {
            html += `<div class="search-section">
                <div class="search-category px-3 pt-2">Restaurants</div>
                ${results.restaurants.map(restaurant => `
                    <div class="search-result-item" data-type="restaurant" data-id="${restaurant.id}">
                        <div class="search-title">${escapeHtml(restaurant.name)}</div>
                        <div class="search-details">${escapeHtml(restaurant.description || 'No description')}</div>
                    </div>
                `).join('')}
            </div>`;
        }
        
        // Concepts
        if (results.concepts.length > 0) {
            html += `<div class="search-section">
                <div class="search-category px-3 pt-2">Concepts</div>
                ${results.concepts.map(concept => `
                    <div class="search-result-item" data-type="concept" data-id="${concept.id}">
                        <div class="search-title">${escapeHtml(concept.value)}</div>
                        <div class="search-details">Category: ${escapeHtml(concept.category)}</div>
                    </div>
                `).join('')}
            </div>`;
        }
        
        // Curators
        if (results.curators.length > 0) {
            html += `<div class="search-section">
                <div class="search-category px-3 pt-2">Curators</div>
                ${results.curators.map(curator => `
                    <div class="search-result-item" data-type="curator" data-id="${curator.id}">
                        <div class="search-title">${escapeHtml(curator.name)}</div>
                        <div class="search-details">ID: ${curator.id}</div>
                    </div>
                `).join('')}
            </div>`;
        }
        
        // Locations
        if (results.locations.length > 0) {
            html += `<div class="search-section">
                <div class="search-category px-3 pt-2">Locations</div>
                ${results.locations.map(location => `
                    <div class="search-result-item" data-type="location" data-id="${location.id}">
                        <div class="search-title">${escapeHtml(location.address || 'No address')}</div>
                        <div class="search-details">Restaurant: ${escapeHtml(location.restaurantName)}</div>
                    </div>
                `).join('')}
            </div>`;
        }
        
        // Update search results container
        searchResults.innerHTML = html;
        
        // Add click handlers to results
        searchResults.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const type = item.dataset.type;
                const id = parseInt(item.dataset.id);
                navigateToResult(type, id);
            });
        });
    };
    
    /**
     * Shows a message when no results are found or an error occurs
     * @param {string} message Message to display
     */
    const showNoResultsMessage = (message) => {
        const searchResults = document.getElementById('searchResults');
        searchResults.innerHTML = `
            <div class="p-3 text-center text-muted">
                <i class="bi bi-search mb-2" style="font-size: 1.5rem;"></i>
                <div>${message}</div>
            </div>
        `;
    };
    
    /**
     * Navigates to a search result
     * @param {string} type Type of entity
     * @param {number} id Entity ID
     */
    const navigateToResult = (type, id) => {
        // Hide search results
        document.getElementById('searchResults').classList.add('d-none');
        document.getElementById('globalSearch').value = '';
        
        // Navigate based on entity type
        switch (type) {
            case 'restaurant':
                Router.navigateTo('restaurants');
                setTimeout(() => {
                    if (typeof RestaurantsView.editRestaurant === 'function') {
                        RestaurantsView.editRestaurant(id);
                    }
                }, 300);
                break;
                
            case 'concept':
                Router.navigateTo('concepts');
                setTimeout(() => {
                    if (typeof ConceptsView.viewConceptDetails === 'function') {
                        ConceptsView.viewConceptDetails(id);
                    }
                }, 300);
                break;
                
            case 'curator':
                Router.navigateTo('curators');
                setTimeout(() => {
                    if (typeof CuratorsView.editCurator === 'function') {
                        CuratorsView.editCurator(id);
                    }
                }, 300);
                break;
                
            case 'location':
                Router.navigateTo('locations');
                setTimeout(() => {
                    if (typeof LocationsView.viewLocationDetails === 'function') {
                        LocationsView.viewLocationDetails(id);
                    }
                }, 300);
                break;
        }
        
        // Show toast notification
        UIManager.showToast('info', 'Navigation', `Navigated to ${type} with ID: ${id}`);
    };
    
    /**
     * Escapes HTML special characters to prevent XSS
     * @param {string} text Text to escape
     * @returns {string} Escaped text
     */
    const escapeHtml = (text) => {
        if (typeof text !== 'string') return '';
        
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    };

    // Public API
    return {
        initialize,
        performSearch
    };
})();
