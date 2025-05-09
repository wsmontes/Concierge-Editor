/**
 * Curator Service - Manages curator entities
 * Dependencies: BaseService, StorageModule, ValidationService
 * Provides curator-specific business logic and data management
 */

const CuratorService = (function() {
    // Create base service for curators
    const baseService = BaseService.createService(
        StorageModule.STORES.CURATORS,
        'curator',
        ValidationService.validateCurator
    );
    
    /**
     * Get active curators ordered by most recently active
     * @returns {Promise<Array>} - Promise resolving to array of sorted curators
     */
    async function getActiveCurators() {
        try {
            const curators = await baseService.getAll();
            
            // Sort by last active date (descending)
            return curators.sort((a, b) => {
                const dateA = new Date(a.lastActive || a.timestamp || 0);
                const dateB = new Date(b.lastActive || b.timestamp || 0);
                return dateB - dateA;
            });
        } catch (error) {
            ErrorHandlingService.handleError(error, 'Getting active curators');
            return [];
        }
    }
    
    /**
     * Update curator's last active timestamp
     * @param {number} curatorId - Curator ID
     * @returns {Promise<Object>} - Promise resolving to updated curator
     */
    async function markActive(curatorId) {
        try {
            const curator = await baseService.getById(curatorId);
            if (!curator) {
                throw new Error(`Curator with ID ${curatorId} not found`);
            }
            
            const updated = {
                ...curator,
                lastActive: new Date().toISOString()
            };
            
            return await baseService.update(curatorId, updated);
        } catch (error) {
            ErrorHandlingService.handleError(error, `Marking curator ${curatorId} as active`);
            throw error;
        }
    }
    
    /**
     * Get restaurant counts per curator
     * @returns {Promise<Array>} - Promise resolving to curators with restaurant counts
     */
    async function getCuratorStats() {
        try {
            const [curators, restaurants] = await Promise.all([
                baseService.getAll(),
                StorageModule.getAllItems(StorageModule.STORES.RESTAURANTS)
            ]);
            
            // Count restaurants per curator
            const counts = {};
            restaurants.forEach(restaurant => {
                if (restaurant.curatorId) {
                    counts[restaurant.curatorId] = (counts[restaurant.curatorId] || 0) + 1;
                }
            });
            
            // Add counts to curator objects
            return curators.map(curator => ({
                ...curator,
                restaurantCount: counts[curator.id] || 0
            }));
        } catch (error) {
            ErrorHandlingService.handleError(error, 'Getting curator statistics');
            return [];
        }
    }
    
    // Extend base service with curator-specific methods
    return {
        ...baseService,
        getActiveCurators,
        markActive,
        getCuratorStats
    };
})();
