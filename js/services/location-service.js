/**
 * Location Service - Manages location entities
 * Dependencies: BaseService, StorageModule, ValidationService
 * Provides location-specific business logic and data management
 */

const LocationService = (function() {
    // Create base service for locations
    const baseService = BaseService.createService(
        StorageModule.STORES.LOCATIONS,
        'location',
        ValidationService.validateLocation
    );
    
    /**
     * Get location for a specific restaurant
     * @param {number} restaurantId - Restaurant ID
     * @returns {Promise<Object|null>} - Promise resolving to location or null
     */
    async function getRestaurantLocation(restaurantId) {
        try {
            const locations = await StorageModule.getItemsByIndex(
                StorageModule.STORES.LOCATIONS,
                'restaurantId',
                parseInt(restaurantId)
            );
            
            return locations[0] || null;
        } catch (error) {
            ErrorHandlingService.handleError(error, `Getting location for restaurant ${restaurantId}`);
            return null;
        }
    }
    
    /**
     * Save location for a restaurant
     * @param {number} restaurantId - Restaurant ID
     * @param {Object} locationData - Location data
     * @returns {Promise<Object>} - Promise resolving to saved location
     */
    async function save(restaurantId, locationData) {
        try {
            // Check if location already exists for this restaurant
            const existing = await getRestaurantLocation(restaurantId);
            
            // Format the location data
            const location = {
                ...locationData,
                restaurantId: parseInt(restaurantId),
                id: existing ? existing.id : Date.now(),
                timestamp: new Date().toISOString()
            };
            
            // Validate location data
            if (ValidationService.validateLocation) {
                const validationResult = ValidationService.validateLocation(location);
                if (!validationResult.valid) {
                    throw new Error(`Invalid location: ${validationResult.errors.join(', ')}`);
                }
            }
            
            // Save to storage
            await StorageModule.saveItem(StorageModule.STORES.LOCATIONS, location);
            return location;
        } catch (error) {
            ErrorHandlingService.handleError(error, 'Saving location');
            throw error;
        }
    }
    
    /**
     * Delete location for a restaurant
     * @param {number} restaurantId - Restaurant ID
     * @returns {Promise<boolean>} - Promise resolving to success flag
     */
    async function deleteRestaurantLocation(restaurantId) {
        try {
            const location = await getRestaurantLocation(restaurantId);
            
            if (!location) {
                return false;
            }
            
            await StorageModule.deleteItem(StorageModule.STORES.LOCATIONS, location.id);
            return true;
        } catch (error) {
            ErrorHandlingService.handleError(error, `Deleting location for restaurant ${restaurantId}`);
            return false;
        }
    }
    
    /**
     * Find restaurants by proximity
     * @param {number} latitude - Latitude coordinate
     * @param {number} longitude - Longitude coordinate
     * @param {number} maxDistance - Maximum distance in kilometers
     * @returns {Promise<Array>} - Promise resolving to array of nearby restaurants
     */
    async function findNearbyRestaurants(latitude, longitude, maxDistance = 5) {
        try {
            // Get all locations
            const locations = await baseService.getAll();
            
            // Calculate distances and filter
            const nearby = [];
            for (const location of locations) {
                const distance = calculateDistance(
                    latitude, longitude,
                    location.latitude, location.longitude
                );
                
                if (distance <= maxDistance) {
                    nearby.push({
                        ...location,
                        distance
                    });
                }
            }
            
            // Sort by distance
            nearby.sort((a, b) => a.distance - b.distance);
            return nearby;
        } catch (error) {
            ErrorHandlingService.handleError(error, 'Finding nearby restaurants');
            return [];
        }
    }
    
    /**
     * Calculate distance between two coordinates using Haversine formula
     * @param {number} lat1 - Latitude of first point
     * @param {number} lon1 - Longitude of first point
     * @param {number} lat2 - Latitude of second point
     * @param {number} lon2 - Longitude of second point
     * @returns {number} - Distance in kilometers
     */
    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in km
        const dLat = toRadians(lat2 - lat1);
        const dLon = toRadians(lon2 - lon1);
        
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
            
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
    
    /**
     * Convert degrees to radians
     * @param {number} degrees - Angle in degrees
     * @returns {number} - Angle in radians
     */
    function toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }
    
    // Extend base service with location-specific methods
    return {
        ...baseService,
        getRestaurantLocation,
        save,
        deleteRestaurantLocation,
        findNearbyRestaurants
    };
})();
