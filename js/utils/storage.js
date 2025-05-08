/**
 * Storage Module - Handles all data storage using IndexedDB
 * Dependencies: idb library for IndexedDB interactions
 * Provides a complete abstraction layer for database operations
 */

const StorageModule = (function() {
    const DB_NAME = 'concierge-editor';
    const DB_VERSION = 2; // Increased version to trigger upgrade
    
    // Object store names
    const STORES = {
        IMAGES: 'restaurantImages',
        RESTAURANTS: 'restaurants',
        CONCEPTS: 'concepts',
        RESTAURANT_CONCEPTS: 'restaurantConcepts',
        LOCATIONS: 'restaurantLocations',
        PHOTOS: 'restaurantPhotos',
        CURATORS: 'curators'
    };
    
    let db = null;

    /**
     * Initialize the IndexedDB database
     * @return {Promise} - Promise that resolves when database is ready
     */
    async function initDatabase() {
        if (db) return Promise.resolve(db);
        
        return new Promise((resolve, reject) => {
            const request = window.indexedDB.open(DB_NAME, DB_VERSION);
            
            request.onerror = function(event) {
                console.error('IndexedDB error:', event.target.error);
                reject('Could not initialize database');
            };
            
            request.onupgradeneeded = function(event) {
                const db = event.target.result;
                
                // Create stores if they don't exist
                if (!db.objectStoreNames.contains(STORES.IMAGES)) {
                    const imageStore = db.createObjectStore(STORES.IMAGES, { keyPath: 'id' });
                    imageStore.createIndex('restaurantId', 'restaurantId', { unique: false });
                }
                
                if (!db.objectStoreNames.contains(STORES.RESTAURANTS)) {
                    const restaurantStore = db.createObjectStore(STORES.RESTAURANTS, { keyPath: 'id' });
                    restaurantStore.createIndex('curatorId', 'curatorId', { unique: false });
                    restaurantStore.createIndex('name', 'name', { unique: false });
                    restaurantStore.createIndex('status', 'status', { unique: false });
                    restaurantStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
                
                if (!db.objectStoreNames.contains(STORES.CONCEPTS)) {
                    const conceptStore = db.createObjectStore(STORES.CONCEPTS, { keyPath: 'id' });
                    conceptStore.createIndex('category', 'category', { unique: false });
                    conceptStore.createIndex('value', 'value', { unique: false });
                }
                
                if (!db.objectStoreNames.contains(STORES.RESTAURANT_CONCEPTS)) {
                    const rcStore = db.createObjectStore(STORES.RESTAURANT_CONCEPTS, { keyPath: 'id' });
                    rcStore.createIndex('restaurantId', 'restaurantId', { unique: false });
                    rcStore.createIndex('conceptId', 'conceptId', { unique: false });
                    // Compound index for uniqueness validation
                    rcStore.createIndex('restaurant_concept', ['restaurantId', 'conceptId'], { unique: true });
                }
                
                if (!db.objectStoreNames.contains(STORES.LOCATIONS)) {
                    const locationStore = db.createObjectStore(STORES.LOCATIONS, { keyPath: 'id' });
                    locationStore.createIndex('restaurantId', 'restaurantId', { unique: true });
                }
                
                if (!db.objectStoreNames.contains(STORES.PHOTOS)) {
                    const photoStore = db.createObjectStore(STORES.PHOTOS, { keyPath: 'id' });
                    photoStore.createIndex('restaurantId', 'restaurantId', { unique: false });
                }
                
                if (!db.objectStoreNames.contains(STORES.CURATORS)) {
                    const curatorStore = db.createObjectStore(STORES.CURATORS, { keyPath: 'id' });
                    curatorStore.createIndex('name', 'name', { unique: false });
                }
            };
            
            request.onsuccess = function(event) {
                db = event.target.result;
                console.log('Database initialized successfully');
                resolve(db);
            };
        });
    }
    
    /**
     * Generic function to add or update an item in a store
     * @param {string} storeName - Name of the store
     * @param {Object} item - Item to store
     * @return {Promise} - Promise that resolves with the item's ID
     */
    async function saveItem(storeName, item) {
        if (!db) await initDatabase();
        
        return new Promise((resolve, reject) => {
            try {
                const transaction = db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                
                const request = store.put(item);
                
                request.onsuccess = function() {
                    resolve(request.result);
                };
                
                request.onerror = function(event) {
                    console.error(`Error saving item to ${storeName}:`, event.target.error);
                    reject(event.target.error);
                };
            } catch (error) {
                console.error(`Error in saveItem (${storeName}):`, error);
                reject(error);
            }
        });
    }
    
    /**
     * Generic function to get an item from a store
     * @param {string} storeName - Name of the store
     * @param {string|number} id - ID of the item
     * @return {Promise<Object>} - Promise that resolves with the item
     */
    async function getItem(storeName, id) {
        if (!db) await initDatabase();
        
        return new Promise((resolve, reject) => {
            try {
                const transaction = db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                
                const request = store.get(id);
                
                request.onsuccess = function() {
                    if (request.result) {
                        resolve(request.result);
                    } else {
                        resolve(null);
                    }
                };
                
                request.onerror = function(event) {
                    console.error(`Error getting item from ${storeName}:`, event.target.error);
                    reject(event.target.error);
                };
            } catch (error) {
                console.error(`Error in getItem (${storeName}):`, error);
                reject(error);
            }
        });
    }
    
    /**
     * Generic function to delete an item from a store
     * @param {string} storeName - Name of the store
     * @param {string|number} id - ID of the item
     * @return {Promise} - Promise that resolves when item is deleted
     */
    async function deleteItem(storeName, id) {
        if (!db) await initDatabase();
        
        return new Promise((resolve, reject) => {
            try {
                const transaction = db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                
                const request = store.delete(id);
                
                request.onsuccess = function() {
                    resolve(true);
                };
                
                request.onerror = function(event) {
                    console.error(`Error deleting item from ${storeName}:`, event.target.error);
                    reject(event.target.error);
                };
            } catch (error) {
                console.error(`Error in deleteItem (${storeName}):`, error);
                reject(error);
            }
        });
    }
    
    /**
     * Generic function to get all items from a store
     * @param {string} storeName - Name of the store
     * @return {Promise<Array>} - Promise that resolves with array of items
     */
    async function getAllItems(storeName) {
        if (!db) await initDatabase();
        
        return new Promise((resolve, reject) => {
            try {
                const transaction = db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                
                const request = store.getAll();
                
                request.onsuccess = function() {
                    resolve(request.result || []);
                };
                
                request.onerror = function(event) {
                    console.error(`Error getting all items from ${storeName}:`, event.target.error);
                    reject(event.target.error);
                };
            } catch (error) {
                console.error(`Error in getAllItems (${storeName}):`, error);
                reject(error);
            }
        });
    }
    
    /**
     * Generic function to query items by an index
     * @param {string} storeName - Name of the store
     * @param {string} indexName - Name of the index
     * @param {*} indexValue - Value to query
     * @return {Promise<Array>} - Promise that resolves with matching items
     */
    async function getItemsByIndex(storeName, indexName, indexValue) {
        if (!db) await initDatabase();
        
        return new Promise((resolve, reject) => {
            try {
                const transaction = db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const index = store.index(indexName);
                
                const request = index.getAll(indexValue);
                
                request.onsuccess = function() {
                    resolve(request.result || []);
                };
                
                request.onerror = function(event) {
                    console.error(`Error querying ${indexName} in ${storeName}:`, event.target.error);
                    reject(event.target.error);
                };
            } catch (error) {
                console.error(`Error in getItemsByIndex (${storeName}):`, error);
                reject(error);
            }
        });
    }
    
    /**
     * Clear all data from a specific store
     * @param {string} storeName - Name of the store to clear
     * @return {Promise} - Promise that resolves when store is cleared
     */
    async function clearStore(storeName) {
        if (!db) await initDatabase();
        
        return new Promise((resolve, reject) => {
            try {
                const transaction = db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                
                const request = store.clear();
                
                request.onsuccess = function() {
                    resolve(true);
                };
                
                request.onerror = function(event) {
                    console.error(`Error clearing ${storeName}:`, event.target.error);
                    reject(event.target.error);
                };
            } catch (error) {
                console.error(`Error in clearStore (${storeName}):`, error);
                reject(error);
            }
        });
    }
    
    /**
     * Store a batch of items in a transaction
     * @param {string} storeName - Name of the store
     * @param {Array} items - Array of items to store
     * @return {Promise} - Promise that resolves when all items are stored
     */
    async function saveBatch(storeName, items) {
        if (!db) await initDatabase();
        if (!Array.isArray(items) || items.length === 0) {
            return Promise.resolve([]);
        }
        
        return new Promise((resolve, reject) => {
            try {
                const transaction = db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const results = [];
                
                transaction.oncomplete = function() {
                    resolve(results);
                };
                
                transaction.onerror = function(event) {
                    console.error(`Error in batch save to ${storeName}:`, event.target.error);
                    reject(event.target.error);
                };
                
                items.forEach(item => {
                    const request = store.put(item);
                    
                    request.onsuccess = function() {
                        results.push(request.result);
                    };
                });
            } catch (error) {
                console.error(`Error in saveBatch (${storeName}):`, error);
                reject(error);
            }
        });
    }
    
    /**
     * Process imported data and store in IndexedDB
     * @param {Object} data - Data to import
     * @return {Promise} - Promise that resolves when import is complete
     */
    async function processImportedData(data) {
        if (!data) {
            return Promise.reject(new Error('No data provided'));
        }
        
        // Basic validation
        if (!data.restaurants && !data.concepts) {
            return Promise.reject(new Error('Invalid data format'));
        }
        
        try {
            await initDatabase();
            
            // Import curators
            if (data.curators && Array.isArray(data.curators)) {
                const existingCurators = await getAllItems(STORES.CURATORS);
                const mergedCurators = mergeArraysById(existingCurators, data.curators);
                await saveBatch(STORES.CURATORS, mergedCurators);
            }
            
            // Import concepts
            if (data.concepts && Array.isArray(data.concepts)) {
                const existingConcepts = await getAllItems(STORES.CONCEPTS);
                const mergedConcepts = mergeArraysById(existingConcepts, data.concepts);
                await saveBatch(STORES.CONCEPTS, mergedConcepts);
            }
            
            // Import restaurants
            if (data.restaurants && Array.isArray(data.restaurants)) {
                const existingRestaurants = await getAllItems(STORES.RESTAURANTS);
                const mergedRestaurants = mergeArraysById(existingRestaurants, data.restaurants);
                await saveBatch(STORES.RESTAURANTS, mergedRestaurants);
            }
            
            // Import restaurant concepts
            if (data.restaurantConcepts && Array.isArray(data.restaurantConcepts)) {
                const existingRC = await getAllItems(STORES.RESTAURANT_CONCEPTS);
                const mergedRC = mergeRelationships(existingRC, data.restaurantConcepts);
                await saveBatch(STORES.RESTAURANT_CONCEPTS, mergedRC);
            }
            
            // Import restaurant locations
            if (data.restaurantLocations && Array.isArray(data.restaurantLocations)) {
                const existingLocations = await getAllItems(STORES.LOCATIONS);
                const mergedLocations = mergeArraysById(existingLocations, data.restaurantLocations);
                await saveBatch(STORES.LOCATIONS, mergedLocations);
            }
            
            // Import photo references
            if (data.restaurantPhotos && Array.isArray(data.restaurantPhotos)) {
                const existingPhotos = await getAllItems(STORES.PHOTOS);
                const mergedPhotos = mergeArraysById(existingPhotos, data.restaurantPhotos);
                await saveBatch(STORES.PHOTOS, mergedPhotos);
            }
            
            return {
                success: true,
                message: 'Data imported successfully',
                stats: {
                    curators: data.curators?.length || 0,
                    concepts: data.concepts?.length || 0,
                    restaurants: data.restaurants?.length || 0,
                    restaurantConcepts: data.restaurantConcepts?.length || 0,
                    locations: data.restaurantLocations?.length || 0,
                    photos: data.restaurantPhotos?.length || 0
                }
            };
        } catch (error) {
            console.error('Error processing import:', error);
            return Promise.reject(new Error('Failed to process import: ' + error.message));
        }
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
    
    // Image-specific functions (keep existing functionality)
    
    /**
     * Store an image in the database
     * @param {Object} image - Image data object
     * @param {string} image.id - Unique ID for the image
     * @param {number} image.restaurantId - ID of the restaurant
     * @param {string} image.photoDataRef - Reference to image data
     * @param {Blob} image.blob - Image blob data
     * @return {Promise} - Promise that resolves when image is stored
     */
    async function storeImage(image) {
        return saveItem(STORES.IMAGES, image);
    }
    
    /**
     * Get an image by ID
     * @param {string} id - ID of the image to retrieve
     * @return {Promise<Object>} - Promise that resolves with the image data
     */
    async function getImage(id) {
        return getItem(STORES.IMAGES, id);
    }
    
    /**
     * Delete an image by ID
     * @param {string} id - ID of the image to delete
     * @return {Promise} - Promise that resolves when image is deleted
     */
    async function deleteImage(id) {
        return deleteItem(STORES.IMAGES, id);
    }
    
    /**
     * Get all images in the database
     * @return {Promise<Array>} - Promise that resolves with array of image data
     */
    async function getAllImages() {
        return getAllItems(STORES.IMAGES);
    }
    
    /**
     * Get all images for a specific restaurant
     * @param {number} restaurantId - ID of the restaurant
     * @return {Promise<Array>} - Promise that resolves with array of image data
     */
    async function getRestaurantImages(restaurantId) {
        return getItemsByIndex(STORES.IMAGES, 'restaurantId', restaurantId);
    }
    
    /**
     * Delete all images for specific restaurants
     * @param {Array} restaurantIds - Array of restaurant IDs
     * @return {Promise} - Promise that resolves when images are deleted
     */
    async function deleteRestaurantImages(restaurantIds) {
        if (!Array.isArray(restaurantIds) || restaurantIds.length === 0) {
            return Promise.resolve(true);
        }
        
        try {
            const allPromises = [];
            
            for (const restaurantId of restaurantIds) {
                const images = await getRestaurantImages(restaurantId);
                
                for (const image of images) {
                    allPromises.push(deleteImage(image.id));
                }
            }
            
            await Promise.all(allPromises);
            return true;
        } catch (error) {
            console.error('Error deleting restaurant images:', error);
            return Promise.reject(error);
        }
    }
    
    /**
     * Get a URL for an image that can be used in img src
     * @param {string} id - ID of the image
     * @return {Promise<string>} - Promise that resolves with the image URL
     */
    async function getImageURL(id) {
        try {
            const image = await getImage(id);
            if (image && image.blob) {
                return URL.createObjectURL(image.blob);
            }
            throw new Error('Image data not found');
        } catch (error) {
            console.error(`Error getting URL for image ${id}:`, error);
            return null;
        }
    }
    
    /**
     * Get total count of items in a store
     * @param {string} storeName - Name of the store to count
     * @return {Promise<number>} - Promise that resolves with the count
     */
    async function countItems(storeName) {
        if (!db) await initDatabase();
        
        return new Promise((resolve, reject) => {
            try {
                const transaction = db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                
                const request = store.count();
                
                request.onsuccess = function() {
                    resolve(request.result || 0);
                };
                
                request.onerror = function(event) {
                    console.error(`Error counting items in ${storeName}:`, event.target.error);
                    reject(event.target.error);
                };
            } catch (error) {
                console.error(`Error in countItems (${storeName}):`, error);
                reject(error);
            }
        });
    }

    /**
     * Export all data from the database in JSON format
     * @return {Promise<Object>} - Promise that resolves with exported data
     */
    async function exportAllData() {
        try {
            await initDatabase();
            
            const restaurants = await getAllItems(STORES.RESTAURANTS);
            const concepts = await getAllItems(STORES.CONCEPTS);
            const restaurantConcepts = await getAllItems(STORES.RESTAURANT_CONCEPTS);
            const restaurantLocations = await getAllItems(STORES.LOCATIONS);
            const restaurantPhotos = await getAllItems(STORES.PHOTOS);
            const curators = await getAllItems(STORES.CURATORS);
            
            return {
                restaurants,
                concepts,
                restaurantConcepts,
                restaurantLocations,
                restaurantPhotos,
                curators
            };
        } catch (error) {
            console.error('Error exporting data:', error);
            return Promise.reject(new Error('Failed to export data: ' + error.message));
        }
    }

    /**
     * Delete restaurants and all associated data
     * @param {Array} restaurantIds - Array of restaurant IDs to delete
     * @return {Promise} - Promise that resolves when deletion is complete
     */
    async function deleteRestaurants(restaurantIds) {
        if (!Array.isArray(restaurantIds) || restaurantIds.length === 0) {
            return Promise.resolve(true);
        }
        
        try {
            // Delete images first
            await deleteRestaurantImages(restaurantIds);
            
            // Delete related data
            for (const restaurantId of restaurantIds) {
                // Delete concepts relationships
                const concepts = await getItemsByIndex(STORES.RESTAURANT_CONCEPTS, 'restaurantId', restaurantId);
                for (const concept of concepts) {
                    await deleteItem(STORES.RESTAURANT_CONCEPTS, concept.id);
                }
                
                // Delete location
                const locations = await getItemsByIndex(STORES.LOCATIONS, 'restaurantId', restaurantId);
                for (const location of locations) {
                    await deleteItem(STORES.LOCATIONS, location.id);
                }
                
                // Delete photo references
                const photos = await getItemsByIndex(STORES.PHOTOS, 'restaurantId', restaurantId);
                for (const photo of photos) {
                    await deleteItem(STORES.PHOTOS, photo.id);
                }
                
                // Delete restaurant
                await deleteItem(STORES.RESTAURANTS, restaurantId);
            }
            
            return true;
        } catch (error) {
            console.error('Error deleting restaurants:', error);
            return Promise.reject(error);
        }
    }
    
    // Public API
    return {
        // Database initialization
        initDatabase,
        
        // Generic data operations
        saveItem,
        getItem,
        deleteItem,
        getAllItems,
        getItemsByIndex,
        clearStore,
        saveBatch,
        countItems,
        
        // Data import/export
        processImportedData,
        exportAllData,
        
        // Image-specific operations
        storeImage,
        getImage,
        deleteImage,
        getAllImages,
        getRestaurantImages,
        deleteRestaurantImages,
        getImageURL,
        
        // Restaurant operations
        deleteRestaurants,
        
        // Store constants for external reference
        STORES
    };
})();
