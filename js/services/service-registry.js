/**
 * Service Registry - Central access point for all services
 * Dependencies: StorageModule and optional service modules
 * Provides unified access to application services
 */

const ServiceRegistry = (function() {
    // Service instance references
    let _restaurantService = null;
    let _conceptService = null;
    let _curatorService = null;
    let _locationService = null;
    let _imageService = null;
    let _storageService = null;
    
    /**
     * Initialize all services
     * @returns {Promise} Promise that resolves when all services are initialized
     */
    async function initServices() {
        console.log('Service Registry: Initializing services');
        
        // Initialize storage service first
        _storageService = StorageModule;
        console.log('Service Registry: Storage initialized');
        
        // Initialize entity services with defensive checks
        // Only assign if the service is defined in the global scope
        _restaurantService = typeof RestaurantService !== 'undefined' ? RestaurantService : null;
        _conceptService = typeof ConceptService !== 'undefined' ? ConceptService : null;
        _curatorService = typeof CuratorService !== 'undefined' ? CuratorService : null;
        _locationService = typeof LocationService !== 'undefined' ? LocationService : null;
        _imageService = typeof ImageService !== 'undefined' ? ImageService : null;
        
        return Promise.resolve();
    }
    
    /**
     * Get restaurant service
     * @returns {Object} RestaurantService instance
     */
    function getRestaurantService() {
        if (!_restaurantService) {
            console.warn('RestaurantService not initialized. Call initServices first.');
            _restaurantService = typeof RestaurantService !== 'undefined' ? RestaurantService : null;
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
            _conceptService = typeof ConceptService !== 'undefined' ? ConceptService : null;
        }
        return _conceptService;
    }
    
    /**
     * Get curator service
     * @returns {Object} CuratorService instance
     */
    function getCuratorService() {
        if (!_curatorService) {
            console.warn('CuratorService not initialized. Call initServices first.');
            _curatorService = typeof CuratorService !== 'undefined' ? CuratorService : null;
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
            _storageService = StorageModule;
        }
        return _storageService;
    }
    
    /**
     * Get image service
     * @returns {Object} ImageService instance
     */
    function getImageService() {
        if (!_imageService) {
            console.warn('ImageService not initialized. Call initServices first.');
            _imageService = typeof ImageService !== 'undefined' ? ImageService : null;
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
            _locationService = typeof LocationService !== 'undefined' ? LocationService : null;
        }
        return _locationService;
    }
    
    // Public API
    return {
        initServices,
        getRestaurantService,
        getConceptService,
        getCuratorService,
        getStorageService,
        getImageService,
        getLocationService
    };
})();
