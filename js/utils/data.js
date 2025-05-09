/**
 * Data Module - Legacy data handling functions
 * Dependencies: BusinessLogicModule
 * Provides backward compatibility with original data module
 * Most functionality now moved to BusinessLogicModule and entity services
 */

const DataModule = (function() {
    // Restaurant status constants for consistency
    const STATUS = BusinessLogicModule.STATUS;
    
    /**
     * Get statistics about the data in the application
     * @return {Promise<Object>} - Promise that resolves with statistics object
     * @deprecated Use BusinessLogicModule.getApplicationStatistics instead
     */
    async function getDataStatistics() {
        return await BusinessLogicModule.getApplicationStatistics();
    }
    
    /**
     * Get restaurant analytics over time
     * @param {string} timeframe - 'week', 'month', or 'year' (default: 'month')
     * @return {Promise<Object>} - Promise that resolves with analytics data for visualization
     * @deprecated Use BusinessLogicModule.getRestaurantAnalytics instead
     */
    async function getRestaurantAnalytics(timeframe = 'month') {
        return await BusinessLogicModule.getRestaurantAnalytics(timeframe);
    }
    
    /**
     * Get popular concepts based on usage
     * @param {number} limit - Maximum number of concepts to return
     * @return {Promise<Array>} - Promise that resolves with array of concepts with usage counts
     * @deprecated Use ConceptService.getConceptUsageStats instead
     */
    async function getPopularConcepts(limit = 15) {
        const conceptService = ServiceRegistry.getConceptService();
        const stats = await conceptService.getConceptUsageStats();
        return stats.slice(0, limit);
    }
    
    /**
     * Process and validate imported data
     * @param {Object} data - Data to be imported
     * @param {File|Blob} [imagesZip] - Optional ZIP file containing images
     * @return {Promise<Object>} - Promise that resolves with processing results
     * @deprecated Use BusinessLogicModule.importData instead
     */
    async function processImportedData(data, imagesZip) {
        return await BusinessLogicModule.importData(data, imagesZip);
    }

    /**
     * Migrate data from localStorage to IndexedDB
     * @return {Promise} - Promise that resolves when migration is complete
     * @deprecated Use BusinessLogicModule.migrateFromLocalStorage instead
     */
    async function migrateFromLocalStorage() {
        return await BusinessLogicModule.migrateFromLocalStorage();
    }
    
    // Public API
    return {
        getDataStatistics,
        getRestaurantAnalytics,
        getPopularConcepts,
        processImportedData,
        migrateFromLocalStorage,
        STATUS
    };
})();
