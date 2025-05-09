/**
 * Business Logic Module - High-level application operations and analytics
 * Dependencies: ServiceRegistry, ValidationService
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
            const imageService = ServiceRegistry.getImageService();
            const locationService = ServiceRegistry.getLocationService();
            
            // Get all data in parallel for efficiency
            const [
                restaurants,
                concepts,
                conceptsByCategory,
                conceptStats
            ] = await Promise.all([
                restaurantService.getAll(),
                conceptService.getAll(),
                conceptService.getConceptsByCategory(),
                conceptService.getConceptUsageStats(),
                // Note: We don't need to fetch all photos/locations as we just need counts
            ]);
            
            // Get counts
            const [photoCount, locationCount] = await Promise.all([
                imageService.count(),
                locationService.count()
            ]);
            
            // Count restaurants by status
            const statusCounts = {};
            Object.values(STATUS).forEach(status => {
                statusCounts[status] = 0;
            });
            
            restaurants.forEach(restaurant => {
                const status = restaurant.status || STATUS.DRAFT;
                statusCounts[status] = (statusCounts[status] || 0) + 1;
            });
            
            // Calculate category metrics
            const categoryCounts = {};
            Object.keys(conceptsByCategory).forEach(category => {
                categoryCounts[category] = conceptsByCategory[category].length;
            });
            
            // Find most popular concepts (top 10)
            const popularConcepts = [...conceptStats]
                .sort((a, b) => b.usageCount - a.usageCount)
                .slice(0, 10);
            
            // Calculate coverage statistics (% of restaurants with concepts, images, etc.)
            const restaurantsWithConcepts = new Set();
            const restaurantsWithPhotos = new Set();
            const restaurantsWithLocations = new Set();
            
            // Analysis requires fetching relation data - might be performance intensive
            // for large datasets, so we'll use a sampling approach for real-time stats
            const totalRestaurants = restaurants.length;
            
            // Get restaurant concepts for analysis
            const restaurantConcepts = await StorageModule.getAllItems(StorageModule.STORES.RESTAURANT_CONCEPTS);
            restaurantConcepts.forEach(rc => {
                restaurantsWithConcepts.add(rc.restaurantId);
            });
            
            // Get restaurant photos for analysis
            const photos = await StorageModule.getAllItems(StorageModule.STORES.PHOTOS);
            photos.forEach(photo => {
                restaurantsWithPhotos.add(photo.restaurantId);
            });
            
            // Get restaurant locations for analysis
            const locations = await StorageModule.getAllItems(StorageModule.STORES.LOCATIONS);
            locations.forEach(location => {
                restaurantsWithLocations.add(location.restaurantId);
            });
            
            return {
                totalRestaurants,
                totalConcepts: concepts.length,
                totalPhotos: photoCount,
                totalLocations: locationCount,
                statusCounts,
                categoryCounts,
                popularConcepts,
                coverage: {
                    concepts: totalRestaurants > 0 ? restaurantsWithConcepts.size / totalRestaurants : 0,
                    photos: totalRestaurants > 0 ? restaurantsWithPhotos.size / totalRestaurants : 0,
                    locations: totalRestaurants > 0 ? restaurantsWithLocations.size / totalRestaurants : 0
                },
                lastUpdated: new Date().toISOString()
            };
        } catch (error) {
            ErrorHandlingService.handleError(error, 'Error getting application statistics');
            return {
                totalRestaurants: 0,
                totalConcepts: 0,
                totalPhotos: 0,
                totalLocations: 0,
                statusCounts: {},
                categoryCounts: {},
                popularConcepts: [],
                coverage: { concepts: 0, photos: 0, locations: 0 },
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
        try {
            const restaurantService = ServiceRegistry.getRestaurantService();
            const restaurants = await restaurantService.getAll();
            
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
            ErrorHandlingService.handleError(error, 'Error getting restaurant analytics');
            return {
                labels: [],
                datasets: [],
                totals: { restaurants: 0, byStatus: {} },
                error: error.message
            };
        }
    }
    
    /**
     * Process and import data from a file
     * @param {Object|string} fileData - JSON data or JSON string to import
     * @param {File|Blob} [imagesZip] - Optional ZIP file containing images
     * @return {Promise<Object>} - Promise that resolves with import results
     */
    async function importData(fileData, imagesZip) {
        try {
            // Parse data if it's a string
            let data = fileData;
            if (typeof fileData === 'string') {
                try {
                    data = JSON.parse(fileData);
                } catch (e) {
                    throw new Error('Invalid JSON format: ' + e.message);
                }
            }
            
            // Validate data structure
            const validationResult = ValidationService.validateImportData(data);
            if (!validationResult.valid) {
                return {
                    success: false,
                    message: validationResult.message,
                    errors: validationResult.errors
                };
            }
            
            // Process main data
            const importResult = await StorageModule.importData(data);
            
            // Process images if provided
            let imageResults = { processed: 0, errors: 0 };
            if (imagesZip && data.restaurantPhotos && data.restaurantPhotos.length > 0) {
                imageResults = await processImportedImages(data.restaurantPhotos, imagesZip);
            }
            
            // Add to import history
            const historyEntry = {
                id: Date.now(),
                timestamp: new Date().toISOString(),
                filename: data.metadata?.filename || 'Unknown file',
                stats: {
                    ...importResult.stats,
                    imagesProcessed: imageResults.processed,
                    imageErrors: imageResults.errors
                }
            };
            
            // Save import history
            const importHistory = JSON.parse(localStorage.getItem('importHistory') || '[]');
            importHistory.unshift(historyEntry);
            localStorage.setItem('importHistory', JSON.stringify(importHistory.slice(0, 20)));
            
            return {
                success: true,
                message: `Import completed successfully. Processed ${importResult.stats.restaurants || 0} restaurants, ${imageResults.processed || 0} images.`,
                stats: {
                    ...importResult.stats,
                    imagesProcessed: imageResults.processed,
                    imageErrors: imageResults.errors
                }
            };
        } catch (error) {
            ErrorHandlingService.handleError(error, 'Data import failed');
            return {
                success: false,
                message: `Import failed: ${error.message}`
            };
        }
    }
    
    /**
     * Export application data
     * @param {Object} options - Export options
     * @param {Array<string>} [options.stores] - Specific stores to export (defaults to all)
     * @param {Array<number>} [options.restaurantIds] - Specific restaurant IDs to export
     * @return {Promise<Object>} - Promise that resolves with exported data
     */
    async function exportData(options = {}) {
        try {
            const { stores, restaurantIds } = options;
            
            // If specific restaurant IDs are provided, export just those
            if (restaurantIds && restaurantIds.length > 0) {
                return await exportSpecificRestaurants(restaurantIds);
            }
            
            // Otherwise export all data or specific stores
            return await StorageModule.exportData(stores);
        } catch (error) {
            ErrorHandlingService.handleError(error, 'Data export failed');
            throw error;
        }
    }
    
    /**
     * Export specific restaurants with all related data
     * @param {Array<number>} restaurantIds - Array of restaurant IDs to export
     * @return {Promise<Object>} - Promise that resolves with exported data
     */
    async function exportSpecificRestaurants(restaurantIds) {
        if (!Array.isArray(restaurantIds) || restaurantIds.length === 0) {
            throw new Error('Valid restaurant IDs are required for export');
        }
        
        try {
            // Get all data first
            const [
                allRestaurants,
                allConcepts,
                allConceptRelations,
                allLocations,
                allPhotos,
                allCurators
            ] = await Promise.all([
                StorageModule.getAllItems(StorageModule.STORES.RESTAURANTS),
                StorageModule.getAllItems(StorageModule.STORES.CONCEPTS),
                StorageModule.getAllItems(StorageModule.STORES.RESTAURANT_CONCEPTS),
                StorageModule.getAllItems(StorageModule.STORES.LOCATIONS),
                StorageModule.getAllItems(StorageModule.STORES.PHOTOS),
                StorageModule.getAllItems(StorageModule.STORES.CURATORS)
            ]);
            
            // Filter restaurants
            const restaurants = allRestaurants.filter(r => 
                restaurantIds.includes(r.id)
            );
            
            // Get restaurant curator IDs
            const curatorIds = [...new Set(restaurants.map(r => r.curatorId))];
            
            // Filter related data
            const restaurantConcepts = allConceptRelations.filter(rc => 
                restaurantIds.includes(rc.restaurantId)
            );
            
            // Get concept IDs used by these restaurants
            const conceptIds = [...new Set(restaurantConcepts.map(rc => rc.conceptId))];
            
            // Filter concepts, locations, photos, curators
            const concepts = allConcepts.filter(c => conceptIds.includes(c.id));
            const restaurantLocations = allLocations.filter(l => restaurantIds.includes(l.restaurantId));
            const restaurantPhotos = allPhotos.filter(p => restaurantIds.includes(p.restaurantId));
            const curators = allCurators.filter(c => curatorIds.includes(c.id));
            
            // Create export object
            return {
                metadata: {
                    exportDate: new Date().toISOString(),
                    type: 'partial',
                    restaurantCount: restaurants.length
                },
                restaurants,
                concepts,
                restaurantConcepts,
                restaurantLocations,
                restaurantPhotos,
                curators
            };
        } catch (error) {
            ErrorHandlingService.handleError(error, 'Error exporting specific restaurants');
            throw error;
        }
    }
    
    /**
     * Process imported images from a ZIP file
     * @param {Array} photoRefs - Photo reference objects from import data
     * @param {File|Blob} zipFile - ZIP file containing images
     * @return {Promise<Object>} - Processing statistics
     */
    async function processImportedImages(photoRefs, zipFile) {
        if (!photoRefs || !zipFile) {
            return { processed: 0, errors: 0 };
        }
        
        try {
            // Load JSZip library - we need to make sure it's available
            if (typeof JSZip !== 'function') {
                throw new Error('JSZip library not available');
            }
            
            const imageService = ServiceRegistry.getImageService();
            const zip = new JSZip();
            const zipContent = await zip.loadAsync(zipFile);
            
            let processed = 0;
            let errors = 0;
            
            // Process each photo reference
            const promises = photoRefs.map(async (photo) => {
                try {
                    if (!photo.photoDataRef) {
                        errors++;
                        return;
                    }
                    
                    // Get file from zip
                    const zipEntry = zipContent.file(photo.photoDataRef);
                    if (!zipEntry) {
                        console.warn(`Image file not found in ZIP: ${photo.photoDataRef}`);
                        errors++;
                        return;
                    }
                    
                    // Read as blob
                    const imageBlob = await zipEntry.async('blob');
                    
                    // Save image using the service
                    await imageService.saveImage({
                        id: photo.id,
                        restaurantId: photo.restaurantId,
                        data: imageBlob,
                        type: photo.type || 'general'
                    });
                    
                    processed++;
                } catch (e) {
                    ErrorHandlingService.handleError(e, `Error processing image ${photo.id}`);
                    errors++;
                }
            });
            
            await Promise.all(promises);
            return { processed, errors };
        } catch (error) {
            ErrorHandlingService.handleError(error, 'Error processing imported images');
            return { processed: 0, errors: photoRefs.length };
        }
    }
    
    /**
     * Migrate data from localStorage to IndexedDB
     * @return {Promise<Object>} - Promise that resolves with migration results
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
            
            // Process the data if there's anything to migrate
            if (restaurants.length > 0 || concepts.length > 0) {
                await importData(data);
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
            ErrorHandlingService.handleError(error, 'Error migrating from localStorage');
            return {
                success: false,
                message: 'Failed to migrate data: ' + error.message,
                migrated: false
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
    
    // Public API
    return {
        getApplicationStatistics,
        getRestaurantAnalytics,
        importData,
        exportData,
        migrateFromLocalStorage,
        STATUS
    };
})();
