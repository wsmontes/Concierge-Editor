/**
 * Data Module - Handles data operations, statistics, and analytics
 * Dependencies: StorageModule for database operations
 */

const DataModule = (function() {
    // Restaurant status constants for consistency
    const STATUS = {
        DRAFT: 'draft',
        REVISED: 'revised',
        PRODUCTION: 'production',
        ARCHIVED: 'archived'
    };
    
    /**
     * Get statistics about the data in the application
     * @return {Promise<Object>} - Promise that resolves with statistics object
     */
    async function getDataStatistics() {
        try {
            // Get counts from IndexedDB
            const restaurantCount = await StorageModule.countItems(StorageModule.STORES.RESTAURANTS);
            const conceptCount = await StorageModule.countItems(StorageModule.STORES.CONCEPTS);
            const photoCount = await StorageModule.countItems(StorageModule.STORES.PHOTOS);
            const locationCount = await StorageModule.countItems(StorageModule.STORES.LOCATIONS);
            
            // Get all restaurants to calculate status counts
            const restaurants = await StorageModule.getAllItems(StorageModule.STORES.RESTAURANTS);
            
            // Count restaurants by status
            const statusCounts = restaurants.reduce((acc, restaurant) => {
                const status = restaurant.status || STATUS.DRAFT;
                acc[status] = (acc[status] || 0) + 1;
                return acc;
            }, {});
            
            // Get all concepts to calculate category counts
            const concepts = await StorageModule.getAllItems(StorageModule.STORES.CONCEPTS);
            
            // Count concepts by category
            const categoryCounts = concepts.reduce((acc, concept) => {
                acc[concept.category] = (acc[concept.category] || 0) + 1;
                return acc;
            }, {});
            
            return {
                totalRestaurants: restaurantCount,
                totalConcepts: conceptCount,
                totalPhotos: photoCount,
                totalLocations: locationCount,
                statusCounts,
                categoryCounts
            };
        } catch (error) {
            console.error('Error getting data statistics:', error);
            return {
                totalRestaurants: 0,
                totalConcepts: 0,
                totalPhotos: 0,
                totalLocations: 0,
                statusCounts: {},
                categoryCounts: {}
            };
        }
    }
    
    /**
     * Get restaurant analytics over time
     * @param {string} timeframe - 'week', 'month', or 'year' (default: 'month')
     * @return {Promise<Object>} - Promise that resolves with analytics data for visualization
     */
    async function getRestaurantAnalytics(timeframe = 'month') {
        try {
            const restaurants = await StorageModule.getAllItems(StorageModule.STORES.RESTAURANTS);
            
            // Prepare date ranges based on timeframe
            const now = new Date();
            const dates = [];
            const counts = [];
            const statusesByDate = [];
            
            switch(timeframe) {
                case 'week':
                    // Last 7 days
                    for (let i = 6; i >= 0; i--) {
                        const date = new Date(now);
                        date.setDate(date.getDate() - i);
                        dates.push(formatDate(date));
                        counts.push(0);
                        statusesByDate.push({
                            [STATUS.DRAFT]: 0,
                            [STATUS.REVISED]: 0,
                            [STATUS.PRODUCTION]: 0,
                            [STATUS.ARCHIVED]: 0
                        });
                    }
                    break;
                
                case 'year':
                    // Last 12 months
                    for (let i = 11; i >= 0; i--) {
                        const date = new Date(now);
                        date.setMonth(date.getMonth() - i);
                        dates.push(formatMonthYear(date));
                        counts.push(0);
                        statusesByDate.push({
                            [STATUS.DRAFT]: 0,
                            [STATUS.REVISED]: 0,
                            [STATUS.PRODUCTION]: 0,
                            [STATUS.ARCHIVED]: 0
                        });
                    }
                    break;
                
                case 'month':
                default:
                    // Last 30 days
                    for (let i = 29; i >= 0; i--) {
                        const date = new Date(now);
                        date.setDate(date.getDate() - i);
                        dates.push(formatDate(date));
                        counts.push(0);
                        statusesByDate.push({
                            [STATUS.DRAFT]: 0,
                            [STATUS.REVISED]: 0,
                            [STATUS.PRODUCTION]: 0,
                            [STATUS.ARCHIVED]: 0
                        });
                    }
                    break;
            }
            
            // Process restaurant data
            restaurants.forEach(restaurant => {
                const timestamp = new Date(restaurant.timestamp);
                const dateStr = timeframe === 'year' 
                    ? formatMonthYear(timestamp) 
                    : formatDate(timestamp);
                
                const index = dates.indexOf(dateStr);
                if (index !== -1) {
                    counts[index]++;
                    
                    // Track status counts
                    const status = restaurant.status || STATUS.DRAFT;
                    statusesByDate[index][status]++;
                }
            });
            
            // Calculate totals for each status
            const statusTotals = {
                [STATUS.DRAFT]: 0,
                [STATUS.REVISED]: 0,
                [STATUS.PRODUCTION]: 0,
                [STATUS.ARCHIVED]: 0
            };
            
            statusesByDate.forEach(dayStats => {
                Object.keys(dayStats).forEach(status => {
                    statusTotals[status] += dayStats[status];
                });
            });
            
            // Return formatted analytics data
            return {
                labels: dates,
                datasets: [
                    {
                        label: 'All Restaurants',
                        data: counts
                    },
                    {
                        label: 'Draft',
                        data: statusesByDate.map(day => day[STATUS.DRAFT])
                    },
                    {
                        label: 'Revised',
                        data: statusesByDate.map(day => day[STATUS.REVISED])
                    },
                    {
                        label: 'Production',
                        data: statusesByDate.map(day => day[STATUS.PRODUCTION])
                    },
                    {
                        label: 'Archived',
                        data: statusesByDate.map(day => day[STATUS.ARCHIVED])
                    }
                ],
                totals: {
                    restaurants: restaurants.length,
                    byStatus: statusTotals
                }
            };
        } catch (error) {
            console.error('Error getting restaurant analytics:', error);
            return {
                labels: [],
                datasets: [],
                totals: { restaurants: 0, byStatus: {} }
            };
        }
    }
    
    /**
     * Format a date as MM/DD/YYYY
     * @param {Date} date - Date to format
     * @return {string} - Formatted date string
     */
    function formatDate(date) {
        return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    }
    
    /**
     * Format a date as Month YYYY
     * @param {Date} date - Date to format
     * @return {string} - Formatted date string
     */
    function formatMonthYear(date) {
        const months = [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];
        return `${months[date.getMonth()]} ${date.getFullYear()}`;
    }
    
    /**
     * Get popular concepts based on usage
     * @param {number} limit - Maximum number of concepts to return
     * @return {Promise<Array>} - Promise that resolves with array of concepts with usage counts
     */
    async function getPopularConcepts(limit = 15) {
        try {
            const concepts = await StorageModule.getAllItems(StorageModule.STORES.CONCEPTS);
            const restaurantConcepts = await StorageModule.getAllItems(StorageModule.STORES.RESTAURANT_CONCEPTS);
            
            // Count concept usage
            const conceptCounts = {};
            restaurantConcepts.forEach(rc => {
                conceptCounts[rc.conceptId] = (conceptCounts[rc.conceptId] || 0) + 1;
            });
            
            // Attach counts to concepts and sort
            return concepts
                .map(concept => ({
                    ...concept,
                    count: conceptCounts[concept.id] || 0
                }))
                .sort((a, b) => b.count - a.count)
                .slice(0, limit);
        } catch (error) {
            console.error('Error getting popular concepts:', error);
            return [];
        }
    }
    
    /**
     * Validate imported data structure
     * @param {Object} data - Data to validate
     * @return {boolean} - Whether the data is valid
     */
    function validateImportData(data) {
        // Basic validation - check that required properties exist
        if (!data) return false;
        
        // At minimum, we need restaurants or concepts
        if (!data.restaurants && !data.concepts) return false;
        
        // If restaurants exist, validate structure
        if (data.restaurants && !Array.isArray(data.restaurants)) return false;
        
        // If concepts exist, validate structure
        if (data.concepts && !Array.isArray(data.concepts)) return false;
        
        return true;
    }
    
    /**
     * Process imported data
     * @param {Object} data - Data to import
     * @return {Promise} - Promise that resolves when import is complete
     */
    async function processImportedData(data) {
        // Make sure data is valid
        if (!validateImportData(data)) {
            return Promise.reject(new Error('Invalid data format'));
        }
        
        try {
            // Use the StorageModule to process the import
            return await StorageModule.processImportedData(data);
        } catch (error) {
            console.error('Error processing imported data:', error);
            return Promise.reject(new Error('Failed to process imported data: ' + error.message));
        }
    }
    
    /**
     * Migrate data from localStorage to IndexedDB
     * @return {Promise} - Promise that resolves when migration is complete
     */
    async function migrateFromLocalStorage() {
        try {
            // Check if localStorage has data
            const restaurants = JSON.parse(localStorage.getItem('restaurants') || '[]');
            const concepts = JSON.parse(localStorage.getItem('concepts') || '[]');
            const restaurantConcepts = JSON.parse(localStorage.getItem('restaurantConcepts') || '[]');
            const restaurantLocations = JSON.parse(localStorage.getItem('restaurantLocations') || '[]');
            const restaurantPhotos = JSON.parse(localStorage.getItem('restaurantPhotos') || '[]');
            const curators = JSON.parse(localStorage.getItem('curators') || '[]');
            
            // Create a data object with the localStorage data
            const data = {
                restaurants,
                concepts,
                restaurantConcepts,
                restaurantLocations,
                restaurantPhotos,
                curators
            };
            
            // Process the data
            if (restaurants.length > 0 || concepts.length > 0) {
                await StorageModule.processImportedData(data);
                return {
                    success: true,
                    message: 'Data migrated from localStorage to IndexedDB',
                    migrated: true
                };
            }
            
            return {
                success: true,
                message: 'No data to migrate',
                migrated: false
            };
        } catch (error) {
            console.error('Error migrating from localStorage:', error);
            return {
                success: false,
                message: 'Failed to migrate data: ' + error.message,
                migrated: false
            };
        }
    }

    // Public API
    return {
        getDataStatistics,
        getRestaurantAnalytics,
        getPopularConcepts,
        validateImportData,
        processImportedData,
        migrateFromLocalStorage,
        STATUS
    };
})();
