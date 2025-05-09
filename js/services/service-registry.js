/**
 * Service Registry - Central access point for all services
 * Dependencies: All service implementations
 * Part of the Service Layer in the application architecture
 */

const ServiceRegistry = (function() {
    // Private service instances
    let _restaurantService = null;
    let _conceptService = null;
    let _imageService = null;
    let _locationService = null;
    let _curatorService = null;
    let _storageService = null;
    
    /**
     * Initialize all services
     * @returns {Promise<void>}
     */
    async function initServices() {
        // Ensure database is ready
        await StorageModule.initDatabase();
        console.log('Service Registry: Storage initialized');
        
        // Initialize services
        _restaurantService = RestaurantService;
        _conceptService = ConceptService;
        _imageService = ImageService;
        _locationService = LocationService;
        _curatorService = CuratorService;
        _storageService = StorageService;
        
        console.log('Service Registry: All services initialized');
    }
    
    /**
     * Get restaurant service
     * @returns {Object} RestaurantService instance
     */
    function getRestaurantService() {
        if (!_restaurantService) {
            console.warn('RestaurantService not initialized. Call initServices first.');
            _restaurantService = RestaurantService;
        }
        return _restaurantService;
    }
    
    /**
     * Get concept service
     * @returns {Object} ConceptService instance
     */
    function getConceptService() {
        if (!_conceptService) {
            console.warn('ConceptService not initialized. Call initServices first.');
            _conceptService = ConceptService;
        }
        return _conceptService;
    }
    
    /**
     * Get image service
     * @returns {Object} ImageService instance
     */
    function getImageService() {
        if (!_imageService) {
            console.warn('ImageService not initialized. Call initServices first.');
            _imageService = ImageService;
        }
        return _imageService;
    }
    
    /**
     * Get location service
     * @returns {Object} LocationService instance
     */
    function getLocationService() {
        if (!_locationService) {
            console.warn('LocationService not initialized. Call initServices first.');
            _locationService = LocationService;
        }
        return _locationService;
    }
    
    /**
     * Get curator service
     * @returns {Object} CuratorService instance
     */
    function getCuratorService() {
        if (!_curatorService) {
            console.warn('CuratorService not initialized. Call initServices first.');
            _curatorService = CuratorService;
        }
        return _curatorService;
    }
    
    /**
     * Get storage service
     * @returns {Object} StorageService instance
     */
    function getStorageService() {
        if (!_storageService) {
            console.warn('StorageService not initialized. Call initServices first.');
            _storageService = StorageService;
        }
        return _storageService;
    }
    
    // Public API
    return {
        initServices,
        getRestaurantService,
        getConceptService,
        getImageService,
        getLocationService,
        getCuratorService,
        getStorageService
    };
})();
