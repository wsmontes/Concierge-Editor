/**
 * Restaurant Service - Handles restaurant data operations
 * Dependencies: StorageModule
 * Part of the Service Layer in the application architecture
 */

const RestaurantService = (function() {
    const STORE = StorageModule.STORES.RESTAURANTS;
    
    /**
     * Get all restaurants
     * @returns {Promise<Array>} Array of all restaurants
     */
    async function getAll() {
        try {
            return await StorageModule.getAllItems(STORE);
        } catch (error) {
            console.error('Error getting all restaurants:', error);
            throw error;
        }
    }
    
    /**
     * Get a restaurant by ID
     * @param {number|string} id - Restaurant ID
     * @returns {Promise<Object>} Restaurant object
     */
    async function getById(id) {
        try {
            return await StorageModule.getItem(STORE, id);
        } catch (error) {
            console.error(`Error getting restaurant ${id}:`, error);
            throw error;
        }
    }
    
    /**
     * Get a restaurant with all its related data
     * @param {number|string} id - Restaurant ID
     * @returns {Promise<Object>} Restaurant with related data
     */
    async function getWithRelations(id) {
        try {
            const restaurant = await getById(id);
            
            if (!restaurant) {
                return { restaurant: null };
            }
            
            // Get curator
            const curator = restaurant.curatorId ? 
                await StorageModule.getItem(StorageModule.STORES.CURATORS, restaurant.curatorId) : 
                null;
            
            // Get associated concepts
            const restaurantConcepts = await StorageModule.getItemsByIndex(
                StorageModule.STORES.RESTAURANT_CONCEPTS,
                'restaurantId',
                restaurant.id
            );
            
            const conceptIds = restaurantConcepts.map(rc => rc.conceptId);
            
            // If we have concept IDs, load the actual concept data
            let concepts = [];
            let conceptsByCategory = {};
            
            if (conceptIds.length > 0) {
                // Load all concepts then filter
                const allConcepts = await StorageModule.getAllItems(StorageModule.STORES.CONCEPTS);
                concepts = allConcepts.filter(concept => conceptIds.includes(concept.id));
                
                // Group concepts by category
                conceptsByCategory = concepts.reduce((acc, concept) => {
                    if (!acc[concept.category]) {
                        acc[concept.category] = [];
                    }
                    acc[concept.category].push(concept);
                    return acc;
                }, {});
            }
            
            // Get location
            const location = await StorageModule.getItemsByIndex(
                StorageModule.STORES.LOCATIONS,
                'restaurantId',
                restaurant.id
            ).then(items => items[0] || null);
            
            // Get photos
            const photos = await StorageModule.getItemsByIndex(
                StorageModule.STORES.PHOTOS,
                'restaurantId',
                restaurant.id
            );
            
            return {
                restaurant,
                curator,
                concepts,
                conceptIds,
                conceptsByCategory,
                location,
                photos
            };
        } catch (error) {
            console.error(`Error getting restaurant ${id} with relations:`, error);
            throw error;
        }
    }
    
    /**
     * Create a new restaurant
     * @param {Object} restaurantData - Restaurant data
     * @returns {Promise<Object>} Created restaurant
     */
    async function create(restaurantData) {
        try {
            // Generate ID if not provided
            if (!restaurantData.id) {
                restaurantData.id = Date.now();
            }
            
            // Set creation timestamp if not provided
            if (!restaurantData.timestamp) {
                restaurantData.timestamp = new Date().toISOString();
            }
            
            return await StorageModule.saveItem(STORE, restaurantData);
        } catch (error) {
            console.error('Error creating restaurant:', error);
            throw error;
        }
    }
    
    /**
     * Update an existing restaurant
     * @param {number|string} id - Restaurant ID
     * @param {Object} restaurantData - Updated restaurant data
     * @returns {Promise<Object>} Updated restaurant
     */
    async function update(id, restaurantData) {
        try {
            const existing = await getById(id);
            
            if (!existing) {
                throw new Error(`Restaurant with ID ${id} not found`);
            }
            
            const updated = {
                ...existing,
                ...restaurantData,
                id: existing.id // Ensure ID remains the same
            };
            
            return await StorageModule.saveItem(STORE, updated);
        } catch (error) {
            console.error(`Error updating restaurant ${id}:`, error);
            throw error;
        }
    }
    
    /**
     * Delete a restaurant
     * @param {number|string} id - Restaurant ID
     * @returns {Promise<void>}
     */
    async function deleteRestaurant(id) {
        try {
            await StorageModule.deleteItem(STORE, id);
        } catch (error) {
            console.error(`Error deleting restaurant ${id}:`, error);
            throw error;
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
            const savedRestaurant = restaurantData.id ? 
                await update(restaurantData.id, restaurantData) : 
                await create(restaurantData);
            
            // Handle concepts if provided
            if (conceptIds && Array.isArray(conceptIds)) {
                await updateRestaurantConcepts(savedRestaurant.id, conceptIds);
            }
            
            // Handle location if provided
            if (location) {
                await saveRestaurantLocation(savedRestaurant.id, location);
            }
            
            // Handle images if provided
            if (images && Array.isArray(images)) {
                // This would use ImageService in a real implementation
            }
            
            return savedRestaurant;
        } catch (error) {
            console.error('Error saving restaurant with relations:', error);
            throw error;
        }
    }
    
    /**
     * Update restaurant concepts
     * @param {number|string} restaurantId - Restaurant ID
     * @param {Array<number|string>} conceptIds - Concept IDs
     * @returns {Promise<void>}
     */
    async function updateRestaurantConcepts(restaurantId, conceptIds) {
        try {
            // Get existing restaurant-concept associations
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
                const assoc = {
                    id: Date.now() + Math.random().toString(36).substring(2, 10),
                    restaurantId,
                    conceptId
                };
                await StorageModule.saveItem(StorageModule.STORES.RESTAURANT_CONCEPTS, assoc);
            }
        } catch (error) {
            console.error(`Error updating concepts for restaurant ${restaurantId}:`, error);
            throw error;
        }
    }
    
    /**
     * Save restaurant location
     * @param {number|string} restaurantId - Restaurant ID
     * @param {Object} locationData - Location data
     * @returns {Promise<Object>} Saved location
     */
    async function saveRestaurantLocation(restaurantId, locationData) {
        try {
            // Check for existing location
            const existingLocations = await StorageModule.getItemsByIndex(
                StorageModule.STORES.LOCATIONS,
                'restaurantId',
                restaurantId
            );
            
            const existingLocation = existingLocations[0];
            
            // Prepare location data
            const location = {
                ...locationData,
                restaurantId
            };
            
            if (existingLocation) {
                // Update existing
                location.id = existingLocation.id;
            } else {
                // Create new
                location.id = Date.now();
            }
            
            return await StorageModule.saveItem(StorageModule.STORES.LOCATIONS, location);
        } catch (error) {
            console.error(`Error saving location for restaurant ${restaurantId}:`, error);
            throw error;
        }
    }
    
    /**
     * Count total restaurants
     * @return {Promise<number>} Number of restaurants
     */
    async function count() {
        try {
            return await StorageModule.countItems(STORE);
        } catch (error) {
            console.error('Error counting restaurants:', error);
            throw error;
        }
    }
    
    /**
     * Get counts of restaurants by status
     * @return {Promise<Object>} Object with status counts
     */
    async function getStatusCounts() {
        try {
            const restaurants = await getAll();
            const statusCounts = {
                draft: 0,
                revised: 0,
                production: 0,
                archived: 0
            };
            
            restaurants.forEach(restaurant => {
                const status = restaurant.status || 'draft';
                if (statusCounts[status] !== undefined) {
                    statusCounts[status]++;
                }
            });
            
            return statusCounts;
        } catch (error) {
            console.error('Error getting restaurant status counts:', error);
            throw error;
        }
    }
    
    /**
     * Get restaurant analytics data
     * @param {string} timeframe - 'week', 'month', or 'year'
     * @return {Promise<Object>} Analytics data for charts
     */
    async function getAnalytics(timeframe = 'month') {
        try {
            const restaurants = await getAll();
            const now = new Date();
            const results = {
                labels: [],
                datasets: [
                    {
                        label: 'Restaurants',
                        data: []
                    }
                ],
                totals: {
                    restaurants: restaurants.length,
                    byStatus: await getStatusCounts()
                }
            };
            
            // Generate time periods based on timeframe
            let timePeriods = [];
            let format = '';
            
            switch (timeframe) {
                case 'week':
                    // Last 7 days
                    for (let i = 6; i >= 0; i--) {
                        const d = new Date();
                        d.setDate(d.getDate() - i);
                        timePeriods.push(d);
                        results.labels.push(d.toLocaleDateString(undefined, { weekday: 'short' }));
                    }
                    format = 'day';
                    break;
                    
                case 'year':
                    // Last 12 months
                    for (let i = 11; i >= 0; i--) {
                        const d = new Date();
                        d.setMonth(d.getMonth() - i);
                        timePeriods.push(d);
                        results.labels.push(d.toLocaleDateString(undefined, { month: 'short' }));
                    }
                    format = 'month';
                    break;
                    
                case 'month':
                default:
                    // Last 30 days in 6 chunks of 5 days
                    for (let i = 5; i >= 0; i--) {
                        const d = new Date();
                        d.setDate(d.getDate() - (i * 5));
                        timePeriods.push(d);
                        results.labels.push(d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }));
                    }
                    format = 'day';
                    break;
            }
            
            // Count restaurants per time period
            const counts = new Array(timePeriods.length).fill(0);
            
            restaurants.forEach(restaurant => {
                const restaurantDate = new Date(restaurant.timestamp);
                
                // Find which period this restaurant belongs to
                for (let i = 0; i < timePeriods.length; i++) {
                    const periodDate = timePeriods[i];
                    const nextPeriodDate = i < timePeriods.length - 1 ? timePeriods[i + 1] : new Date();
                    
                    if (isSamePeriod(restaurantDate, periodDate, format) || 
                        (restaurantDate >= periodDate && restaurantDate < nextPeriodDate)) {
                        counts[i]++;
                        break;
                    }
                }
            });
            
            results.datasets[0].data = counts;
            return results;
        } catch (error) {
            console.error('Error getting restaurant analytics:', error);
            throw error;
        }
    }
    
    /**
     * Helper to check if two dates are in the same period
     * @param {Date} date1 - First date
     * @param {Date} date2 - Second date
     * @param {string} format - Period format ('day', 'month', 'year')
     * @return {boolean} Whether dates are in the same period
     */
    function isSamePeriod(date1, date2, format) {
        switch (format) {
            case 'day':
                return date1.getDate() === date2.getDate() && 
                       date1.getMonth() === date2.getMonth() && 
                       date1.getFullYear() === date2.getFullYear();
            case 'month':
                return date1.getMonth() === date2.getMonth() && 
                       date1.getFullYear() === date2.getFullYear();
            case 'year':
                return date1.getFullYear() === date2.getFullYear();
            default:
                return false;
        }
    }
    
    // Public API
    return {
        getAll,
        getById,
        getWithRelations,
        create,
        update,
        deleteRestaurant,
        saveWithRelations,
        updateRestaurantConcepts,
        saveRestaurantLocation,
        count,
        getStatusCounts,
        getAnalytics
    };
})();
