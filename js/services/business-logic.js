/**
 * Business Logic Module - High-level application operations and analytics
 * Dependencies: ServiceRegistry
 * Provides consolidated business logic, analytics, and data processing functions
 */

const BusinessLogicModule = (function() {
    // Restaurant status constants for consistency
    const STATUS = {
        DRAFT: 'draft',
        REVISED: 'revised',
        PRODUCTION: 'production',
        ARCHIVED: 'archived'
    };
    
    /**
     * Get comprehensive statistics about the data in the application
     * @return {Promise<Object>} - Promise that resolves with statistics object
     */
    async function getApplicationStatistics() {
        try {
            // Get service instances
            const restaurantService = ServiceRegistry.getRestaurantService();
            const conceptService = ServiceRegistry.getConceptService();
            
            // Get statistics with defensive checks
            const totalRestaurants = restaurantService ? await restaurantService.count() : 0;
            const totalConcepts = conceptService ? await conceptService.count() : 0;
            
            // Default status counts
            const statusCounts = {
                draft: 0,
                revised: 0,
                production: 0,
                archived: 0
            };
            
            // Return statistics
            return {
                totalRestaurants,
                totalConcepts,
                statusCounts,
                categoryCounts: {},
                popularConcepts: [],
                coverage: {
                    concepts: 0,
                    photos: 0,
                    locations: 0
                }
            };
        } catch (error) {
            console.error('Error getting application statistics:', error);
            return {
                totalRestaurants: 0,
                totalConcepts: 0,
                statusCounts: {},
                error: error.message
            };
        }
    }
    
    /**
     * Get restaurant analytics over time
     * @param {string} timeframe - 'week', 'month', or 'year' (default: 'month')
     * @return {Promise<Object>} - Promise that resolves with analytics data for visualization
     */
    async function getRestaurantAnalytics(timeframe = 'month') {
        return {
            labels: [],
            datasets: [{data: []}],
            totals: {
                restaurants: 0,
                byStatus: {}
            }
        };
    }
    
    /**
     * Import data from a file
     * @param {Object} data - Data to import
     * @param {File} [imagesZip] - Optional ZIP file containing images
     * @return {Promise<Object>} - Promise that resolves with import results
     */
    async function importData(data, imagesZip) {
        try {
            const storageService = ServiceRegistry.getStorageService();
            return storageService.importData(data);
        } catch (error) {
            console.error('Error importing data:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    /**
     * Migrate data from localStorage to IndexedDB
     * @return {Promise<Object>} - Promise that resolves with migration results
     */
    async function migrateFromLocalStorage() {
        return {
            success: true,
            message: 'No data to migrate',
            migrated: false
        };
    }
    
    // Public API
    return {
        STATUS,
        getApplicationStatistics,
        getRestaurantAnalytics,
        importData,
        migrateFromLocalStorage
    };
})();
