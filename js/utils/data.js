/**
 * Data Module - Handles data operations, statistics, and analytics
 * Dependencies: None
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
     * @return {Object} - Object containing various statistics
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
    
    /**
     * Get restaurant analytics over time
     * @param {string} timeframe - 'week', 'month', or 'year' (default: 'month')
     * @return {Object} - Analytics data for visualization
     */
    function getRestaurantAnalytics(timeframe = 'month') {
        const restaurants = JSON.parse(localStorage.getItem('restaurants') || '[]');
        
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
     * @return {Array} - Array of concepts with usage counts
     */
    function getPopularConcepts(limit = 15) {
        const concepts = JSON.parse(localStorage.getItem('concepts') || '[]');
        const restaurantConcepts = JSON.parse(localStorage.getItem('restaurantConcepts') || '[]');
        
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
     * Process imported data and store in localStorage
     * @param {Object} data - Data to import
     * @return {Promise} - Promise that resolves when import is complete
     */
    async function processImportedData(data) {
        // Make sure data is valid
        if (!validateImportData(data)) {
            return Promise.reject(new Error('Invalid data format'));
        }
        
        return new Promise((resolve, reject) => {
            try {
                // Process restaurants
                if (data.restaurants && Array.isArray(data.restaurants)) {
                    const existingRestaurants = JSON.parse(localStorage.getItem('restaurants') || '[]');
                    
                    // Merge existing and new restaurants by ID
                    const mergedRestaurants = mergeArraysById(existingRestaurants, data.restaurants);
                    localStorage.setItem('restaurants', JSON.stringify(mergedRestaurants));
                }
                
                // Process concepts
                if (data.concepts && Array.isArray(data.concepts)) {
                    const existingConcepts = JSON.parse(localStorage.getItem('concepts') || '[]');
                    
                    // Merge existing and new concepts by ID
                    const mergedConcepts = mergeArraysById(existingConcepts, data.concepts);
                    localStorage.setItem('concepts', JSON.stringify(mergedConcepts));
                }
                
                // Process restaurant-concept relationships
                if (data.restaurantConcepts && Array.isArray(data.restaurantConcepts)) {
                    const existingRelationships = JSON.parse(localStorage.getItem('restaurantConcepts') || '[]');
                    
                    // Use custom merge to prevent duplicates in relationships
                    const mergedRelationships = mergeRelationships(existingRelationships, data.restaurantConcepts);
                    localStorage.setItem('restaurantConcepts', JSON.stringify(mergedRelationships));
                }
                
                // Process locations
                if (data.restaurantLocations && Array.isArray(data.restaurantLocations)) {
                    const existingLocations = JSON.parse(localStorage.getItem('restaurantLocations') || '[]');
                    
                    // Merge by restaurantId since there should be one location per restaurant
                    const mergedLocations = mergeArraysByProperty(existingLocations, data.restaurantLocations, 'restaurantId');
                    localStorage.setItem('restaurantLocations', JSON.stringify(mergedLocations));
                }
                
                // Process photo references
                if (data.restaurantPhotos && Array.isArray(data.restaurantPhotos)) {
                    const existingPhotos = JSON.parse(localStorage.getItem('restaurantPhotos') || '[]');
                    
                    // Merge by ID
                    const mergedPhotos = mergeArraysById(existingPhotos, data.restaurantPhotos);
                    localStorage.setItem('restaurantPhotos', JSON.stringify(mergedPhotos));
                }
                
                // Process curators
                if (data.curators && Array.isArray(data.curators)) {
                    const existingCurators = JSON.parse(localStorage.getItem('curators') || '[]');
                    
                    // Merge by ID
                    const mergedCurators = mergeArraysById(existingCurators, data.curators);
                    localStorage.setItem('curators', JSON.stringify(mergedCurators));
                }
                
                resolve({
                    success: true,
                    message: 'Data imported successfully'
                });
                
            } catch (error) {
                console.error('Error processing imported data:', error);
                reject(new Error('Failed to process imported data: ' + error.message));
            }
        });
    }
    
    /**
     * Merge two arrays of objects by ID, newer objects replace older ones
     * @param {Array} existingArray - Existing array of objects
     * @param {Array} newArray - New array of objects
     * @return {Array} - Merged array
     */
    function mergeArraysById(existingArray, newArray) {
        // Create a map of existing items by ID
        const itemMap = new Map();
        
        // Add existing items to map
        existingArray.forEach(item => {
            if (item.id) {
                itemMap.set(item.id, item);
            }
        });
        
        // Update/add new items
        newArray.forEach(item => {
            if (item.id) {
                itemMap.set(item.id, item);
            }
        });
        
        // Convert map back to array
        return Array.from(itemMap.values());
    }
    
    /**
     * Merge two arrays of objects by a specified property
     * @param {Array} existingArray - Existing array of objects
     * @param {Array} newArray - New array of objects
     * @param {string} property - Property to merge by
     * @return {Array} - Merged array
     */
    function mergeArraysByProperty(existingArray, newArray, property) {
        // Create a map of existing items by property
        const itemMap = new Map();
        
        // Add existing items to map
        existingArray.forEach(item => {
            if (item[property] !== undefined) {
                itemMap.set(item[property], item);
            }
        });
        
        // Update/add new items
        newArray.forEach(item => {
            if (item[property] !== undefined) {
                itemMap.set(item[property], item);
            }
        });
        
        // Convert map back to array
        return Array.from(itemMap.values());
    }
    
    /**
     * Merge restaurant-concept relationships, avoiding duplicates
     * @param {Array} existingRelationships - Existing relationships
     * @param {Array} newRelationships - New relationships
     * @return {Array} - Merged relationships
     */
    function mergeRelationships(existingRelationships, newRelationships) {
        // Create a set of existing relationship keys
        const relationshipSet = new Set();
        const result = [...existingRelationships];
        
        // Add existing relationships to set
        existingRelationships.forEach(rel => {
            const key = `${rel.restaurantId}-${rel.conceptId}`;
            relationshipSet.add(key);
        });
        
        // Add new relationships if they don't already exist
        newRelationships.forEach(rel => {
            const key = `${rel.restaurantId}-${rel.conceptId}`;
            if (!relationshipSet.has(key)) {
                relationshipSet.add(key);
                result.push(rel);
            }
        });
        
        return result;
    }

    // Public API
    return {
        getDataStatistics: getDataStatistics,
        getRestaurantAnalytics: getRestaurantAnalytics,
        getPopularConcepts: getPopularConcepts,
        validateImportData: validateImportData,
        processImportedData: processImportedData
    };
})();
