/**
 * Location Service - Handles restaurant location data
 * Dependencies: BaseService, StorageModule
 * Provides location management functionality
 */

class LocationService extends BaseService {
    /**
     * Initialize the location service
     */
    constructor() {
        super(StorageModule.STORES.LOCATIONS);
    }
    
    /**
     * Get location for a specific restaurant
     * @param {string|number} restaurantId - Restaurant ID
     * @return {Promise<Object>} - Promise with restaurant's location
     */
    async getRestaurantLocation(restaurantId) {
        try {
            const locations = await StorageModule.getItemsByIndex(
                this.storeName, 'restaurantId', restaurantId
            );
            
            return locations.length > 0 ? locations[0] : null;
        } catch (error) {
            console.error(`Error getting location for restaurant ${restaurantId}:`, error);
            throw new Error(`Failed to get restaurant location: ${error.message}`);
        }
    }
    
    /**
     * Save location for a restaurant
     * @param {Object} locationData - Location data
     * @param {string|number} locationData.restaurantId - Restaurant ID
     * @return {Promise<Object>} - Promise with saved location
     */
    async saveRestaurantLocation(locationData) {
        if (!locationData || !locationData.restaurantId) {
            throw new Error('Restaurant ID is required in location data');
        }
        
        try {
            // Check if location already exists for this restaurant
            const existingLocation = await this.getRestaurantLocation(locationData.restaurantId);
            
            // Prepare location data
            const location = {
                ...locationData,
                timestamp: new Date().toISOString()
            };
            
            // Update existing or create new
            if (existingLocation) {
                location.id = existingLocation.id;
            } else {
                location.id = Date.now();
            }
            
            await StorageModule.saveItem(this.storeName, location);
            return location;
        } catch (error) {
            console.error('Error saving restaurant location:', error);
            throw new Error(`Failed to save location: ${error.message}`);
        }
    }
    
    /**
     * Delete location for a restaurant
     * @param {string|number} restaurantId - Restaurant ID
     * @return {Promise<boolean>} - Promise resolving to true if successful
     */
    async deleteRestaurantLocation(restaurantId) {
        try {
            const location = await this.getRestaurantLocation(restaurantId);
            
            if (!location) {
                return true; // Nothing to delete
            }
            
            await StorageModule.deleteItem(this.storeName, location.id);
            return true;
        } catch (error) {
            console.error(`Error deleting location for restaurant ${restaurantId}:`, error);
            throw new Error(`Failed to delete location: ${error.message}`);
        }
    }
    
    /**
     * Find restaurants within geographic area
     * @param {Object} coordinates - Center point coordinates
     * @param {number} coordinates.latitude - Latitude
     * @param {number} coordinates.longitude - Longitude
     * @param {number} radiusKm - Search radius in kilometers
     * @return {Promise<Array>} - Promise with matching restaurant locations
     */
    async findLocationsInArea(coordinates, radiusKm = 5) {
        if (!coordinates || typeof coordinates.latitude !== 'number' || typeof coordinates.longitude !== 'number') {
            throw new Error('Valid coordinates are required');
        }
        
        try {
            const allLocations = await this.getAll();
            
            // Filter locations within radius
            const locationsInArea = allLocations.filter(location => 
                this.calculateDistance(
                    coordinates.latitude,
                    coordinates.longitude,
                    location.latitude,
                    location.longitude
                ) <= radiusKm
            );
            
            return locationsInArea;
        } catch (error) {
            console.error('Error finding locations in area:', error);
            throw new Error(`Failed to search locations: ${error.message}`);
        }
    }
    
    /**
     * Calculate distance between two points using Haversine formula
     * @param {number} lat1 - Latitude of point 1
     * @param {number} lon1 - Longitude of point 1
     * @param {number} lat2 - Latitude of point 2
     * @param {number} lon2 - Longitude of point 2
     * @return {number} - Distance in kilometers
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth radius in km
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);
        
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
            
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        
        return distance;
    }
    
    /**
     * Convert degrees to radians
     * @param {number} degrees - Angle in degrees
     * @return {number} - Angle in radians
     */
    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }
}

// Singleton instance
const locationService = new LocationService();
