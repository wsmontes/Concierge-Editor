/**
 * Storage Service - Provides high-level storage operations
 * Dependencies: StorageModule
 * Part of the Service Layer in the application architecture
 */

const StorageService = (function() {
    /**
     * Export all data from the database
     * @return {Promise<Object>} All application data
     */
    async function exportAllData() {
        try {
            return await StorageModule.exportData();
        } catch (error) {
            console.error('Error exporting all data:', error);
            throw error;
        }
    }
    
    /**
     * Export specific stores from the database
     * @param {Array<string>} storeNames - Names of stores to export
     * @return {Promise<Object>} Exported data
     */
    async function exportStores(storeNames) {
        try {
            return await StorageModule.exportData(storeNames);
        } catch (error) {
            console.error('Error exporting stores:', error);
            throw error;
        }
    }
    
    /**
     * Import data into the database
     * @param {Object} data - Data to import
     * @return {Promise<Object>} Result of the import operation
     */
    async function importData(data) {
        try {
            return await StorageModule.importData(data);
        } catch (error) {
            console.error('Error importing data:', error);
            throw error;
        }
    }
    
    /**
     * Get database statistics
     * @return {Promise<Object>} Database statistics
     */
    async function getDatabaseStats() {
        try {
            const stores = Object.values(StorageModule.STORES);
            const statsPromises = stores.map(async store => {
                const count = await StorageModule.countItems(store);
                return { store, count };
            });
            
            const stats = await Promise.all(statsPromises);
            const result = {};
            
            stats.forEach(({ store, count }) => {
                result[store] = count;
            });
            
            return result;
        } catch (error) {
            console.error('Error getting database stats:', error);
            throw error;
        }
    }
    
    // Public API
    return {
        exportAllData,
        exportStores,
        importData,
        getDatabaseStats
    };
})();
