/**
 * Restaurant Service - Manages restaurant entities
 * Dependencies: BaseService, StorageModule, ValidationService, ErrorHandlingService
 * Provides restaurant-specific business logic and data management
 */

// Use var to prevent duplicate declaration error when script is loaded multiple times
var RestaurantService = (function() {
    // Create base service for restaurants
    const storeName = StorageModule.STORES.RESTAURANTS;
    
    /**
     * Get all restaurants
     * @returns {Promise<Array>} - Promise resolving to array of restaurants
     */
    async function getAll() {
        try {
            return await StorageModule.getAllItems(storeName);
        } catch (error) {
            ErrorHandlingService.handleError(error, 'Getting all restaurants');
            return [];
        }
    }
    
    /**
     * Get a restaurant by ID
     * @param {number} id - Restaurant ID
     * @returns {Promise<Object>} - Promise resolving to restaurant object
     */
    async function getById(id) {
        try {
            return await StorageModule.getItem(storeName, id);
        } catch (error) {
            ErrorHandlingService.handleError(error, `Getting restaurant ${id}`);
            return null;
        }
    }
    
    /**
     * Create a new restaurant
     * @param {Object} data - Restaurant data
     * @returns {Promise<Object>} - Promise resolving to created restaurant
     */
    async function create(data) {
        try {
            // Default properties if not provided
            const restaurant = {
                name: data.name || 'New Restaurant',
                status: data.status || 'draft',
                timestamp: data.timestamp || new Date().toISOString(),
                curatorId: data.curatorId || null,
                description: data.description || null,
                transcription: data.transcription || null,
                id: Date.now()
            };
            
            // Save the restaurant
            await StorageModule.saveItem(storeName, restaurant);
            
            return restaurant;
        } catch (error) {
            ErrorHandlingService.handleError(error, 'Creating restaurant');
            throw error;
        }
    }
    
    /**
     * Get restaurant with all related data
     * @param {number} id - Restaurant ID
     * @returns {Promise<Object>} - Promise resolving to restaurant with related data
     */
    async function getWithRelations(id) {
        try {
            // Get restaurant
            const restaurant = await StorageModule.getItem(storeName, id);
            if (!restaurant) {
                return { restaurant: null };
            }
            
            // Get curator
            let curator = null;
            if (restaurant.curatorId) {
                curator = await StorageModule.getItem(StorageModule.STORES.CURATORS, restaurant.curatorId);
            }
            
            return {
                restaurant,
                curator,
                concepts: [],
                conceptIds: [],
                photos: [],
                location: null
            };
        } catch (error) {
            ErrorHandlingService.handleError(error, `Getting restaurant ${id} with relations`);
            return { restaurant: null, error: error.message };
        }
    }
    
    /**
     * Count total restaurants
     * @returns {Promise<number>} - Promise resolving to count
     */
    async function count() {
        try {
            return await StorageModule.countItems(storeName);
        } catch (error) {
            ErrorHandlingService.handleError(error, 'Counting restaurants');
            return 0;
        }
    }
    
    /**
     * Get counts of restaurants by status
     * @returns {Promise<Object>} - Promise resolving to status counts
     */
    async function getStatusCounts() {
        try {
            const restaurants = await getAll();
            const counts = {
                draft: 0,
                revised: 0,
                production: 0,
                archived: 0
            };
            
            restaurants.forEach(restaurant => {
                const status = restaurant.status || 'draft';
                counts[status] = (counts[status] || 0) + 1;
            });
            
            return counts;
        } catch (error) {
            ErrorHandlingService.handleError(error, 'Getting restaurant status counts');
            return { draft: 0, revised: 0, production: 0, archived: 0 };
        }
    }
    
    /**
     * Save a restaurant with its relations
     * @param {Object} restaurantData - Restaurant data
     * @param {Object} relations - Related data (concepts, location, etc.)
     * @returns {Promise<Object>} Saved restaurant
     */
    async function saveWithRelations(restaurantData, relations = {}) {
        try {
            const { conceptIds, location, images } = relations;
            
            // Save restaurant
            let savedRestaurant;
            if (restaurantData.id) {
                savedRestaurant = await baseService.update(restaurantData.id, restaurantData);
            } else {
                savedRestaurant = await baseService.create(restaurantData);
            }
            
            // Handle concepts if provided
            if (conceptIds && Array.isArray(conceptIds)) {
                await saveConcepts(savedRestaurant.id, conceptIds);
            }
            
            // Handle location if provided
            if (location) {
                const locationService = ServiceRegistry.getLocationService();
                await locationService.save(savedRestaurant.id, location);
            }
            
            // Handle images if provided
            if (images && Array.isArray(images)) {
                const imageService = ServiceRegistry.getImageService();
                for (const image of images) {
                    await imageService.saveImage(savedRestaurant.id, image);
                }
            }
            
            return savedRestaurant;
        } catch (error) {
            ErrorHandlingService.handleError(error, 'Saving restaurant with relations');
            throw error;
        }
    }
    
    /**
     * Save concepts for a restaurant
     * @param {number} restaurantId - Restaurant ID
     * @param {Array<number>} conceptIds - Array of concept IDs
     * @returns {Promise<void>}
     */
    async function saveConcepts(restaurantId, conceptIds) {
        try {
            // Get existing associations
            const existingAssociations = await StorageModule.getItemsByIndex(
                StorageModule.STORES.RESTAURANT_CONCEPTS,
                'restaurantId',
                restaurantId
            );
            
            // Delete existing associations
            for (const assoc of existingAssociations) {
                await StorageModule.deleteItem(StorageModule.STORES.RESTAURANT_CONCEPTS, assoc.id);
            }
            
            // Create new associations
            for (const conceptId of conceptIds) {
                await StorageModule.saveItem(StorageModule.STORES.RESTAURANT_CONCEPTS, {
                    id: Date.now() + Math.random().toString(36).substring(2, 10),
                    restaurantId,
                    conceptId
                });
            }
        } catch (error) {
            ErrorHandlingService.handleError(error, `Saving concepts for restaurant ${restaurantId}`);
            throw error;
        }
    }
    
    /**
     * Search for restaurants based on criteria
     * @param {Object} criteria - Search criteria
     * @returns {Promise<Object>} Search results and pagination info
     */
    async function search(criteria = {}) {
        try {
            let restaurants = await baseService.getAll();
            let filteredCount = restaurants.length;
            
            // Apply filters
            if (criteria) {
                // Text search
                if (criteria.text) {
                    const searchText = criteria.text.toLowerCase();
                    restaurants = restaurants.filter(r => 
                        r.name.toLowerCase().includes(searchText) || 
                        (r.description && r.description.toLowerCase().includes(searchText)) ||
                        (r.transcription && r.transcription.toLowerCase().includes(searchText))
                    );
                }
                
                // Status filter
                if (criteria.statuses && criteria.statuses.length > 0) {
                    restaurants = restaurants.filter(r => {
                        const status = r.status || 'draft';
                        return criteria.statuses.includes(status);
                    });
                }
                
                // Apply more filters as needed
            }
            
            // Get total count after filtering
            filteredCount = restaurants.length;
            
            // Pagination
            const page = criteria.page || 1;
            const pageSize = criteria.pageSize || 10;
            const start = (page - 1) * pageSize;
            const end = start + pageSize;
            const paginatedRestaurants = restaurants.slice(start, end);
            
            return {
                restaurants: paginatedRestaurants,
                pagination: {
                    total: filteredCount,
                    page,
                    pageSize,
                    pages: Math.ceil(filteredCount / pageSize)
                }
            };
        } catch (error) {
            ErrorHandlingService.handleError(error, 'Searching restaurants');
            return { restaurants: [], pagination: { total: 0, page: 1, pageSize: 10, pages: 0 } };
        }
    }

    // Public API
    return {
        getAll,
        getById,
        create,
        getWithRelations,
        count,
        getStatusCounts,
        saveWithRelations,
        saveConcepts,
        search
    };
})();
