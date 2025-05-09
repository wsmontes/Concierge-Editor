/**
 * search-service.js
 * 
 * Purpose: Provides generic search capabilities to all available data
 * Handles retrieval, filtering, and preparation of data for search results
 * 
 * Dependencies:
 *   - concierge-data.js - For database access and model coordination
 */

const SearchService = (() => {
    // Cache for search results
    let searchCache = {};
    
    /**
     * Searches for restaurants based on criteria
     * @param {Object} criteria - Search criteria object
     * @returns {Promise<Array>} Search results
     */
    const searchRestaurants = async (criteria = {}) => {
        try {
            const restaurantModel = ConciergeData.getEntityModel('restaurant');
            if (!restaurantModel) {
                throw new Error('Restaurant model not found');
            }
            
            // Get all restaurants
            const restaurants = await restaurantModel.restaurants.getAll();
            
            // Apply filters
            const filtered = applyRestaurantFilters(restaurants, criteria);
            
            // If we need to enrich with curator info
            const enriched = await enrichRestaurantData(filtered);
            
            // Cache the search results
            searchCache.restaurants = enriched;
            
            return enriched;
        } catch (error) {
            console.error('Error searching restaurants:', error);
            throw error;
        }
    };
    
    /**
     * Applies filters to restaurant data
     * @param {Array} restaurants - Restaurant data to filter
     * @param {Object} criteria - Filter criteria
     * @returns {Array} Filtered restaurant data
     */
    const applyRestaurantFilters = (restaurants, criteria) => {
        return restaurants.filter(restaurant => {
            // Keyword search in name and description
            if (criteria.keyword && criteria.keyword.trim() !== '') {
                const keyword = criteria.keyword.toLowerCase();
                const nameMatch = restaurant.name && restaurant.name.toLowerCase().includes(keyword);
                const descMatch = restaurant.description && restaurant.description.toLowerCase().includes(keyword);
                
                if (!nameMatch && !descMatch) {
                    return false;
                }
            }
            
            // Filter by curator
            if (criteria.curatorId && restaurant.curatorId !== parseInt(criteria.curatorId)) {
                return false;
            }
            
            return true;
        });
    };
    
    /**
     * Enriches restaurant data with additional information
     * @param {Array} restaurants - Restaurants to enrich
     * @returns {Promise<Array>} Enriched restaurant data
     */
    const enrichRestaurantData = async (restaurants) => {
        const restaurantModel = ConciergeData.getEntityModel('restaurant');
        const enriched = [];
        
        for (const restaurant of restaurants) {
            try {
                // Get curator info
                let curator = { id: restaurant.curatorId, name: `ID: ${restaurant.curatorId}` };
                try {
                    const curatorData = await restaurantModel.curators.getById(restaurant.curatorId);
                    if (curatorData) {
                        curator = curatorData;
                    }
                } catch (error) {
                    console.warn(`Could not get curator for restaurant ${restaurant.id}:`, error);
                }
                
                // Get concept count
                let conceptCount = 0;
                try {
                    const concepts = await restaurantModel.restaurantConcepts.getByRestaurantId(restaurant.id);
                    conceptCount = concepts ? concepts.length : 0;
                } catch (error) {
                    console.warn(`Could not get concepts for restaurant ${restaurant.id}:`, error);
                }
                
                // Get location count
                let locationCount = 0;
                try {
                    const locations = await restaurantModel.restaurantLocations.getByRestaurantId(restaurant.id);
                    locationCount = locations ? locations.length : 0;
                } catch (error) {
                    console.warn(`Could not get locations for restaurant ${restaurant.id}:`, error);
                }
                
                // Get photo count and primary photo
                let photoCount = 0;
                let primaryPhoto = null;
                try {
                    const photos = await restaurantModel.restaurantPhotos.getByRestaurantId(restaurant.id);
                    photoCount = photos ? photos.length : 0;
                    if (photos && photos.length > 0) {
                        primaryPhoto = photos[0].url;
                    }
                } catch (error) {
                    console.warn(`Could not get photos for restaurant ${restaurant.id}:`, error);
                }
                
                // Build enriched restaurant object
                enriched.push({
                    ...restaurant,
                    curator: curator.name || `ID: ${curator.id}`,
                    conceptCount,
                    locationCount,
                    photoCount,
                    primaryPhoto
                });
            } catch (error) {
                console.error(`Error enriching restaurant ${restaurant.id}:`, error);
                // Still include the restaurant with minimal info
                enriched.push({
                    ...restaurant,
                    curator: `ID: ${restaurant.curatorId}`,
                    conceptCount: 0,
                    locationCount: 0,
                    photoCount: 0
                });
            }
        }
        
        return enriched;
    };
    
    /**
     * Searches for concepts based on criteria
     * @param {Object} criteria - Search criteria object
     * @returns {Promise<Array>} Search results
     */
    const searchConcepts = async (criteria = {}) => {
        try {
            const restaurantModel = ConciergeData.getEntityModel('restaurant');
            if (!restaurantModel) {
                throw new Error('Restaurant model not found');
            }
            
            // Get all concepts
            const concepts = await restaurantModel.concepts.getAll();
            
            // Apply filters
            const filtered = concepts.filter(concept => {
                // Keyword search in value
                if (criteria.keyword && criteria.keyword.trim() !== '') {
                    const keyword = criteria.keyword.toLowerCase();
                    const valueMatch = concept.value && concept.value.toLowerCase().includes(keyword);
                    const categoryMatch = concept.category && concept.category.toLowerCase().includes(keyword);
                    
                    if (!valueMatch && !categoryMatch) {
                        return false;
                    }
                }
                
                // Filter by category
                if (criteria.category && concept.category !== criteria.category) {
                    return false;
                }
                
                return true;
            });
            
            // Get usage counts for each concept
            const enriched = await Promise.all(filtered.map(async (concept) => {
                let usageCount = 0;
                try {
                    const usages = await restaurantModel.restaurantConcepts.queryByConceptId(concept.id);
                    usageCount = usages ? usages.length : 0;
                } catch (error) {
                    console.warn(`Could not get usage count for concept ${concept.id}:`, error);
                }
                
                return {
                    ...concept,
                    usageCount
                };
            }));
            
            // Cache the search results
            searchCache.concepts = enriched;
            
            return enriched;
        } catch (error) {
            console.error('Error searching concepts:', error);
            throw error;
        }
    };
    
    /**
     * Searches for curators based on criteria
     * @param {Object} criteria - Search criteria object
     * @returns {Promise<Array>} Search results
     */
    const searchCurators = async (criteria = {}) => {
        try {
            const restaurantModel = ConciergeData.getEntityModel('restaurant');
            if (!restaurantModel) {
                throw new Error('Restaurant model not found');
            }
            
            // Get all curators
            const curators = await restaurantModel.curators.getAll();
            
            // Apply filters
            const filtered = curators.filter(curator => {
                // Keyword search in name
                if (criteria.keyword && criteria.keyword.trim() !== '') {
                    const keyword = criteria.keyword.toLowerCase();
                    const nameMatch = curator.name && curator.name.toLowerCase().includes(keyword);
                    
                    if (!nameMatch) {
                        return false;
                    }
                }
                
                return true;
            });
            
            // Get restaurant counts for each curator
            const enriched = await Promise.all(filtered.map(async (curator) => {
                let restaurantCount = 0;
                try {
                    const restaurants = await restaurantModel.restaurants.getByCuratorId(curator.id);
                    restaurantCount = restaurants ? restaurants.length : 0;
                } catch (error) {
                    console.warn(`Could not get restaurant count for curator ${curator.id}:`, error);
                }
                
                return {
                    ...curator,
                    restaurantCount
                };
            }));
            
            // Cache the search results
            searchCache.curators = enriched;
            
            return enriched;
        } catch (error) {
            console.error('Error searching curators:', error);
            throw error;
        }
    };
    
    /**
     * Loads filter options for search components
     * @returns {Promise<Object>} Filter options
     */
    const loadFilterOptions = async () => {
        try {
            const restaurantModel = ConciergeData.getEntityModel('restaurant');
            if (!restaurantModel) {
                throw new Error('Restaurant model not found');
            }
            
            const [categories, curators] = await Promise.all([
                restaurantModel.concepts.getCategories(),
                restaurantModel.curators.getAll()
            ]);
            
            return {
                categories,
                curators
            };
        } catch (error) {
            console.error('Error loading filter options:', error);
            throw error;
        }
    };
    
    /**
     * Performs a search operation based on data type and criteria
     * @param {string} dataType - Type of data to search (restaurants, concepts, curators)
     * @param {Object} criteria - Search criteria object
     * @returns {Promise<Array>} Search results
     */
    const search = async (dataType, criteria = {}) => {
        switch(dataType) {
            case 'restaurants':
                return await searchRestaurants(criteria);
            case 'concepts':
                return await searchConcepts(criteria);
            case 'curators':
                return await searchCurators(criteria);
            default:
                throw new Error(`Unknown data type: ${dataType}`);
        }
    };
    
    /**
     * Gets cached search results or performs a new search
     * @param {string} dataType - Type of data to get
     * @param {Object} criteria - Search criteria
     * @returns {Promise<Array>} The search results
     */
    const getSearchResults = async (dataType, criteria = {}) => {
        // If we have a cache and no criteria, use the cache
        if (searchCache[dataType] && Object.keys(criteria).length === 0) {
            return searchCache[dataType];
        }
        
        // Otherwise perform a new search
        return await search(dataType, criteria);
    };
    
    /**
     * Clears the search cache to force fresh data loading
     */
    const clearCache = () => {
        searchCache = {};
    };
    
    // Public API
    return {
        search,
        getSearchResults,
        loadFilterOptions,
        clearCache
    };
})();
