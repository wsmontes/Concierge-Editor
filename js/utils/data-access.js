/**
 * Data Access Utility - Legacy compatibility layer
 * Dependencies: ServiceRegistry
 * Provides backward compatibility with original data access patterns
 * Most functionality now moved to entity services
 */

const DataAccessUtil = (function() {
    /**
     * Get all restaurants
     * @param {boolean} includeRelated - Whether to include related data (concepts, locations)
     * @return {Promise<Object>} - Promise that resolves with restaurants and related data
     * @deprecated Use RestaurantService methods directly
     */
    async function getRestaurants(includeRelated = false) {
        try {
            const restaurantService = ServiceRegistry.getRestaurantService();
            const restaurants = await restaurantService.getAll();
            
            if (!includeRelated) {
                return { restaurants };
            }
            
            // Get related data
            const conceptService = ServiceRegistry.getConceptService();
            const locationService = ServiceRegistry.getLocationService();
            
            const [restaurantConcepts, concepts, locations] = await Promise.all([
                StorageModule.getAllItems(StorageModule.STORES.RESTAURANT_CONCEPTS),
                conceptService.getAll(),
                locationService.getAll()
            ]);
            
            return { 
                restaurants,
                restaurantConcepts,
                concepts,
                locations
            };
        } catch (error) {
            ErrorHandlingService.handleError(error, 'Error getting restaurants');
            return { restaurants: [], error: error.message };
        }
    }
    
    /**
     * Get a specific restaurant with related data
     * @param {number} restaurantId - ID of the restaurant to get
     * @return {Promise<Object>} - Promise that resolves with restaurant data and related items
     * @deprecated Use RestaurantService.getWithRelations instead
     */
    async function getRestaurant(restaurantId) {
        try {
            const restaurantService = ServiceRegistry.getRestaurantService();
            const result = await restaurantService.getWithRelations(restaurantId);
            
            return {
                restaurant: result.restaurant,
                curator: result.curator,
                concepts: result.concepts,
                location: result.location,
                images: result.photos
            };
        } catch (error) {
            ErrorHandlingService.handleError(error, `Error getting restaurant ${restaurantId}`);
            return { error: error.message };
        }
    }
    
    /**
     * Get all concepts
     * @return {Promise<Array>} - Promise that resolves with array of concepts
     * @deprecated Use ConceptService.getAll instead
     */
    async function getConcepts() {
        try {
            const conceptService = ServiceRegistry.getConceptService();
            return await conceptService.getAll();
        } catch (error) {
            ErrorHandlingService.handleError(error, 'Error getting concepts');
            return [];
        }
    }
    
    /**
     * Get all curators
     * @return {Promise<Array>} - Promise that resolves with array of curators
     */
    async function getCurators() {
        try {
            return await StorageModule.getAllItems(StorageModule.STORES.CURATORS);
        } catch (error) {
            ErrorHandlingService.handleError(error, 'Error getting curators');
            return [];
        }
    }
    
    /**
     * Save restaurant data
     * @param {Object} restaurantData - Restaurant data to save
     * @param {Array} conceptIds - Concept IDs to associate with restaurant
     * @return {Promise<Object>} - Promise that resolves with the saved restaurant
     * @deprecated Use RestaurantService.saveWithRelations instead
     */
    async function saveRestaurant(restaurantData, conceptIds = []) {
        try {
            // Validate restaurant data
            const validationResult = ValidationService.validateRestaurant(restaurantData);
            if (!validationResult.valid) {
                throw new Error(`Invalid restaurant data: ${validationResult.errors.join(', ')}`);
            }
            
            // Use restaurant service
            const restaurantService = ServiceRegistry.getRestaurantService();
            const savedRestaurant = await restaurantService.saveWithRelations(
                restaurantData,
                { conceptIds }
            );
            
            return savedRestaurant;
        } catch (error) {
            ErrorHandlingService.handleError(error, 'Error saving restaurant');
            throw error;
        }
    }
    
    // Public API
    return {
        getRestaurants,
        getRestaurant,
        getConcepts,
        getCurators,
        saveRestaurant
    };
})();
