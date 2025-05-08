/**
 * Data Module - Handles data operations, storage, and processing
 * Dependencies: None
 */

const DataModule = (function() {
    // Restaurant status constants
    const STATUS = {
        DRAFT: 'draft',
        REVISED: 'revised',
        PRODUCTION: 'production',
        ARCHIVED: 'archived'
    };
    
    /**
     * Process and store imported restaurant data
     * @param {Object} data - The validated import data
     * @return {Promise} - Resolves when processing is complete
     */
    function processImportedData(data) {
        return new Promise((resolve, reject) => {
            try {
                // In a real implementation, this would store to IndexedDB or similar
                // For now, we'll store in localStorage as a simple demonstration
                
                // Store or merge curators
                const existingCurators = JSON.parse(localStorage.getItem('curators') || '[]');
                const newCurators = mergeCurators(existingCurators, data.curators);
                localStorage.setItem('curators', JSON.stringify(newCurators));
                
                // Store or merge concepts
                const existingConcepts = JSON.parse(localStorage.getItem('concepts') || '[]');
                const newConcepts = mergeConcepts(existingConcepts, data.concepts);
                localStorage.setItem('concepts', JSON.stringify(newConcepts));
                
                // Store or merge restaurants
                const existingRestaurants = JSON.parse(localStorage.getItem('restaurants') || '[]');
                
                // Set default status for imported restaurants
                const restaurantsWithStatus = data.restaurants.map(restaurant => {
                    return { ...restaurant, status: restaurant.status || STATUS.DRAFT };
                });
                
                const newRestaurants = mergeRestaurants(existingRestaurants, restaurantsWithStatus);
                localStorage.setItem('restaurants', JSON.stringify(newRestaurants));
                
                // Store or merge restaurant concepts
                const existingRestaurantConcepts = JSON.parse(localStorage.getItem('restaurantConcepts') || '[]');
                const newRestaurantConcepts = mergeRestaurantConcepts(existingRestaurantConcepts, data.restaurantConcepts);
                localStorage.setItem('restaurantConcepts', JSON.stringify(newRestaurantConcepts));
                
                // Process restaurant locations if present
                if (Array.isArray(data.restaurantLocations)) {
                    const existingLocations = JSON.parse(localStorage.getItem('restaurantLocations') || '[]');
                    const newLocations = mergeRestaurantLocations(existingLocations, data.restaurantLocations);
                    localStorage.setItem('restaurantLocations', JSON.stringify(newLocations));
                }
                
                // Process restaurant photos if present
                if (Array.isArray(data.restaurantPhotos)) {
                    const existingPhotos = JSON.parse(localStorage.getItem('restaurantPhotos') || '[]');
                    const newPhotos = mergeRestaurantPhotos(existingPhotos, data.restaurantPhotos);
                    localStorage.setItem('restaurantPhotos', JSON.stringify(newPhotos));
                }
                
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Validate imported data structure
     * @param {Object} data - The parsed JSON data
     * @return {boolean} - Whether the data is valid
     */
    function validateImportData(data) {
        // Basic validation of expected structure based on import specification
        return (
            data && 
            Array.isArray(data.restaurants) && 
            Array.isArray(data.concepts) && 
            Array.isArray(data.curators)
        );
    }

    /**
     * Merge curator data, avoiding duplicates
     * @param {Array} existing - Existing curators
     * @param {Array} imported - Imported curators
     * @return {Array} - Merged curator array
     */
    function mergeCurators(existing, imported) {
        const idMap = new Map();
        existing.forEach(curator => idMap.set(curator.id, curator));
        
        imported.forEach(curator => {
            if (!idMap.has(curator.id)) {
                idMap.set(curator.id, curator);
            }
        });
        
        return Array.from(idMap.values());
    }

    /**
     * Merge concept data, avoiding duplicates but updating existing
     * @param {Array} existing - Existing concepts
     * @param {Array} imported - Imported concepts
     * @return {Array} - Merged concept array
     */
    function mergeConcepts(existing, imported) {
        const map = new Map();
        existing.forEach(concept => map.set(concept.id, concept));
        
        imported.forEach(concept => {
            // For concepts, we update with newer data if it exists
            if (map.has(concept.id)) {
                const existingConcept = map.get(concept.id);
                // Update only if the imported concept is newer
                if (new Date(concept.timestamp) > new Date(existingConcept.timestamp)) {
                    map.set(concept.id, concept);
                }
            } else {
                map.set(concept.id, concept);
            }
        });
        
        return Array.from(map.values());
    }

    /**
     * Merge restaurant data, avoiding duplicates but updating existing
     * @param {Array} existing - Existing restaurants
     * @param {Array} imported - Imported restaurants
     * @return {Array} - Merged restaurant array
     */
    function mergeRestaurants(existing, imported) {
        const map = new Map();
        existing.forEach(restaurant => map.set(restaurant.id, restaurant));
        
        imported.forEach(restaurant => {
            // For restaurants, we update with newer data if it exists
            if (map.has(restaurant.id)) {
                const existingRestaurant = map.get(restaurant.id);
                // Update only if the imported restaurant is newer
                if (new Date(restaurant.timestamp) > new Date(existingRestaurant.timestamp)) {
                    // Preserve status if not present in imported data
                    if (!restaurant.status && existingRestaurant.status) {
                        restaurant.status = existingRestaurant.status;
                    }
                    map.set(restaurant.id, restaurant);
                }
            } else {
                map.set(restaurant.id, restaurant);
            }
        });
        
        return Array.from(map.values());
    }

    /**
     * Merge restaurant concept relationships, avoiding duplicates
     * @param {Array} existing - Existing relationships
     * @param {Array} imported - Imported relationships
     * @return {Array} - Merged relationship array
     */
    function mergeRestaurantConcepts(existing, imported) {
        const map = new Map();
        
        // Create unique keys for each relationship
        existing.forEach(rc => {
            const key = `${rc.restaurantId}-${rc.conceptId}`;
            map.set(key, rc);
        });
        
        imported.forEach(rc => {
            const key = `${rc.restaurantId}-${rc.conceptId}`;
            if (!map.has(key)) {
                map.set(key, rc);
            }
        });
        
        return Array.from(map.values());
    }

    /**
     * Merge restaurant locations, avoiding duplicates but updating existing
     * @param {Array} existing - Existing locations
     * @param {Array} imported - Imported locations
     * @return {Array} - Merged locations array
     */
    function mergeRestaurantLocations(existing, imported) {
        const map = new Map();
        existing.forEach(location => map.set(location.restaurantId, location));
        
        imported.forEach(location => {
            map.set(location.restaurantId, location);
        });
        
        return Array.from(map.values());
    }
    
    /**
     * Merge restaurant photo references, avoiding duplicates
     * @param {Array} existing - Existing photo references
     * @param {Array} imported - Imported photo references
     * @return {Array} - Merged photo references array
     */
    function mergeRestaurantPhotos(existing, imported) {
        const map = new Map();
        
        // Create unique keys for each photo
        existing.forEach(photo => {
            map.set(photo.id.toString(), photo);
        });
        
        imported.forEach(photo => {
            map.set(photo.id.toString(), photo);
        });
        
        return Array.from(map.values());
    }
    
    /**
     * Get statistics about the restaurant data
     * @return {Object} - Object containing statistics
     */
    function getDataStatistics() {
        const restaurants = JSON.parse(localStorage.getItem('restaurants') || '[]');
        const concepts = JSON.parse(localStorage.getItem('concepts') || '[]');
        const photos = JSON.parse(localStorage.getItem('restaurantPhotos') || '[]');
        const locations = JSON.parse(localStorage.getItem('restaurantLocations') || '[]');
        
        // Count restaurants by status
        const statusCounts = restaurants.reduce((acc, restaurant) => {
            const status = restaurant.status || STATUS.DRAFT;
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});
        
        // Count concepts by category
        const categoryCounts = concepts.reduce((acc, concept) => {
            acc[concept.category] = (acc[concept.category] || 0) + 1;
            return acc;
        }, {});
        
        return {
            totalRestaurants: restaurants.length,
            totalConcepts: concepts.length,
            totalPhotos: photos.length,
            totalLocations: locations.length,
            statusCounts,
            categoryCounts
        };
    }

    // Public API
    return {
        processImportedData: processImportedData,
        validateImportData: validateImportData,
        getDataStatistics: getDataStatistics,
        STATUS: STATUS
    };
})();
