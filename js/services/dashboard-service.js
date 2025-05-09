/**
 * dashboard-service.js
 * 
 * Purpose: Provides generic access and libraries for charts, analytics, and visualization services
 * Handles data aggregation and preparation for dashboard visualizations
 * 
 * Dependencies:
 *   - concierge-data.js - For database access and model coordination
 *   - Chart.js - For rendering charts and visualizations
 */

const DashboardService = (() => {
    // Cache for dashboard data
    let dataCache = {};
    
    /**
     * Fetches restaurant data and prepares it for dashboard use
     * @param {Object} options - Filter options like timeframe
     * @returns {Promise<Object>} Restaurant data aggregated for dashboard
     */
    const getRestaurantData = async (options = {}) => {
        try {
            const restaurantModel = ConciergeData.getEntityModel('restaurant');
            if (!restaurantModel) {
                throw new Error('Restaurant model not found');
            }
            
            // Get all restaurants
            const restaurants = await restaurantModel.restaurants.getAll();
            
            // Apply timeframe filter if specified
            const filteredRestaurants = filterByTimeframe(restaurants, options.timeframe);
            
            // Cache the results for future use
            dataCache.restaurants = filteredRestaurants;
            
            return filteredRestaurants;
        } catch (error) {
            console.error('Error fetching restaurant data:', error);
            throw error;
        }
    };
    
    /**
     * Fetches concept data and aggregates by category
     * @param {Object} options - Filter options
     * @returns {Promise<Object>} Aggregated concept data
     */
    const getConceptData = async (options = {}) => {
        try {
            const restaurantModel = ConciergeData.getEntityModel('restaurant');
            if (!restaurantModel) {
                throw new Error('Restaurant model not found');
            }
            
            // Get all concepts
            const concepts = await restaurantModel.concepts.getAll();
            const restaurantConcepts = await restaurantModel.restaurantConcepts.getAll();
            
            // Group by category
            const byCategory = {};
            concepts.forEach(concept => {
                const category = concept.category || 'Uncategorized';
                if (!byCategory[category]) {
                    byCategory[category] = [];
                }
                byCategory[category].push(concept);
            });
            
            // Count restaurant associations
            const conceptCounts = {};
            restaurantConcepts.forEach(rc => {
                if (!conceptCounts[rc.conceptId]) {
                    conceptCounts[rc.conceptId] = 0;
                }
                conceptCounts[rc.conceptId]++;
            });
            
            // Cache the results
            dataCache.concepts = {
                all: concepts,
                byCategory,
                counts: conceptCounts
            };
            
            return dataCache.concepts;
        } catch (error) {
            console.error('Error fetching concept data:', error);
            throw error;
        }
    };
    
    /**
     * Fetches location data for mapping
     * @param {Object} options - Filter options
     * @returns {Promise<Array>} Location data for restaurants
     */
    const getLocationData = async (options = {}) => {
        try {
            const restaurantModel = ConciergeData.getEntityModel('restaurant');
            if (!restaurantModel) {
                throw new Error('Restaurant model not found');
            }
            
            // Get all locations
            const locations = await restaurantModel.restaurantLocations.getAll();
            
            // Filter locations with valid coordinates
            const mappableLocations = locations.filter(
                loc => loc.latitude && loc.longitude
            );
            
            // Match with restaurant names
            const restaurantLookup = {};
            if (dataCache.restaurants) {
                dataCache.restaurants.forEach(r => {
                    restaurantLookup[r.id] = r;
                });
            } else {
                const restaurants = await restaurantModel.restaurants.getAll();
                restaurants.forEach(r => {
                    restaurantLookup[r.id] = r;
                });
            }
            
            // Enhance location data with restaurant info
            const enhancedLocations = mappableLocations.map(loc => ({
                ...loc,
                restaurantName: restaurantLookup[loc.restaurantId]?.name || 'Unknown'
            }));
            
            // Cache the results
            dataCache.locations = enhancedLocations;
            
            return enhancedLocations;
        } catch (error) {
            console.error('Error fetching location data:', error);
            throw error;
        }
    };
    
    /**
     * Fetches curator activity data
     * @param {Object} options - Filter options
     * @returns {Promise<Array>} Curator activity data
     */
    const getCuratorActivity = async (options = {}) => {
        try {
            const restaurantModel = ConciergeData.getEntityModel('restaurant');
            if (!restaurantModel) {
                throw new Error('Restaurant model not found');
            }
            
            // Get all curators
            const curators = await restaurantModel.curators.getAll();
            
            // Get restaurant counts by curator
            const restaurants = dataCache.restaurants || await restaurantModel.restaurants.getAll();
            
            const curatorCounts = {};
            restaurants.forEach(restaurant => {
                const curatorId = restaurant.curatorId;
                if (!curatorCounts[curatorId]) {
                    curatorCounts[curatorId] = 0;
                }
                curatorCounts[curatorId]++;
            });
            
            // Enhance curator data with restaurant counts
            const enhancedCurators = curators.map(curator => ({
                ...curator,
                restaurantCount: curatorCounts[curator.id] || 0
            }));
            
            // Cache the results
            dataCache.curatorActivity = enhancedCurators;
            
            return enhancedCurators;
        } catch (error) {
            console.error('Error fetching curator activity:', error);
            throw error;
        }
    };
    
    /**
     * Filters data by timeframe
     * @param {Array} data - Data array with timestamp property
     * @param {string} timeframe - Timeframe identifier (7days, 30days, etc.)
     * @returns {Array} Filtered data
     */
    const filterByTimeframe = (data, timeframe) => {
        if (!timeframe || timeframe === 'all') {
            return data;
        }
        
        const now = new Date();
        let cutoffDate;
        
        switch(timeframe) {
            case '7days':
                cutoffDate = new Date(now.setDate(now.getDate() - 7));
                break;
            case '30days':
                cutoffDate = new Date(now.setDate(now.getDate() - 30));
                break;
            case '90days':
                cutoffDate = new Date(now.setDate(now.getDate() - 90));
                break;
            case '12months':
                cutoffDate = new Date(now.setMonth(now.getMonth() - 12));
                break;
            default:
                return data;
        }
        
        return data.filter(item => {
            if (!item.timestamp) return true;
            return new Date(item.timestamp) >= cutoffDate;
        });
    };
    
    /**
     * Creates a chart instance
     * @param {string} elementId - ID of the canvas element
     * @param {string} type - Chart type (bar, line, pie, etc.)
     * @param {Object} data - Chart data
     * @param {Object} options - Chart options
     * @returns {Chart} Chart instance
     */
    const createChart = (elementId, type, data, options = {}) => {
        const ctx = document.getElementById(elementId).getContext('2d');
        return new Chart(ctx, {
            type,
            data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                ...options
            }
        });
    };
    
    /**
     * Gets cached data or fetches new data if not in cache
     * @param {string} dataType - Type of data to get (restaurants, concepts, etc.)
     * @param {Object} options - Fetch options
     * @returns {Promise<any>} The requested data
     */
    const getData = async (dataType, options = {}) => {
        // If data is in cache and no specific options, use cache
        if (dataCache[dataType] && Object.keys(options).length === 0) {
            return dataCache[dataType];
        }
        
        // Otherwise fetch fresh data
        switch(dataType) {
            case 'restaurants':
                return await getRestaurantData(options);
            case 'concepts':
                return await getConceptData(options);
            case 'locations':
                return await getLocationData(options);
            case 'curatorActivity':
                return await getCuratorActivity(options);
            default:
                throw new Error(`Unknown data type: ${dataType}`);
        }
    };
    
    /**
     * Clears the data cache to force fresh data fetching
     */
    const clearCache = () => {
        dataCache = {};
    };
    
    // Public API
    return {
        getData,
        createChart,
        clearCache
    };
})();
