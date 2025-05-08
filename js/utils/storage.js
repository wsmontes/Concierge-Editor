/**
 * Storage Module - Handles image and data storage using IndexedDB
 * Dependencies: idb library for IndexedDB interactions
 */

const StorageModule = (function() {
    const DB_NAME = 'concierge-editor';
    const DB_VERSION = 1;
    const IMAGES_STORE = 'restaurantImages';
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
                
                // Create image store with indexes
                if (!db.objectStoreNames.contains(IMAGES_STORE)) {
                    const imageStore = db.createObjectStore(IMAGES_STORE, { keyPath: 'id' });
                    imageStore.createIndex('restaurantId', 'restaurantId', { unique: false });
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
     * Store an image in the database
     * @param {Object} image - Image data object
     * @param {string} image.id - Unique ID for the image
     * @param {number} image.restaurantId - ID of the restaurant
     * @param {string} image.photoDataRef - Reference to image data
     * @param {Blob} image.blob - Image blob data
     * @return {Promise} - Promise that resolves when image is stored
     */
    async function storeImage(image) {
        if (!db) await initDatabase();
        
        return new Promise((resolve, reject) => {
            try {
                const transaction = db.transaction([IMAGES_STORE], 'readwrite');
                const imageStore = transaction.objectStore(IMAGES_STORE);
                
                const request = imageStore.put(image);
                
                request.onsuccess = function() {
                    resolve(true);
                };
                
                request.onerror = function(event) {
                    console.error('Error storing image:', event.target.error);
                    reject(event.target.error);
                };
                
                transaction.oncomplete = function() {
                    console.log(`Image ${image.id} stored successfully`);
                };
            } catch (error) {
                console.error('Error in storeImage:', error);
                reject(error);
            }
        });
    }
    
    /**
     * Get an image by ID
     * @param {string} id - ID of the image to retrieve
     * @return {Promise<Object>} - Promise that resolves with the image data
     */
    async function getImage(id) {
        if (!db) await initDatabase();
        
        return new Promise((resolve, reject) => {
            try {
                const transaction = db.transaction([IMAGES_STORE], 'readonly');
                const imageStore = transaction.objectStore(IMAGES_STORE);
                
                const request = imageStore.get(id);
                
                request.onsuccess = function() {
                    if (request.result) {
                        resolve(request.result);
                    } else {
                        reject(new Error(`Image with ID ${id} not found`));
                    }
                };
                
                request.onerror = function(event) {
                    console.error('Error getting image:', event.target.error);
                    reject(event.target.error);
                };
            } catch (error) {
                console.error('Error in getImage:', error);
                reject(error);
            }
        });
    }
    
    /**
     * Delete an image by ID
     * @param {string} id - ID of the image to delete
     * @return {Promise} - Promise that resolves when image is deleted
     */
    async function deleteImage(id) {
        if (!db) await initDatabase();
        
        return new Promise((resolve, reject) => {
            try {
                const transaction = db.transaction([IMAGES_STORE], 'readwrite');
                const imageStore = transaction.objectStore(IMAGES_STORE);
                
                const request = imageStore.delete(id);
                
                request.onsuccess = function() {
                    resolve(true);
                };
                
                request.onerror = function(event) {
                    console.error('Error deleting image:', event.target.error);
                    reject(event.target.error);
                };
            } catch (error) {
                console.error('Error in deleteImage:', error);
                reject(error);
            }
        });
    }
    
    /**
     * Get all images in the database
     * @return {Promise<Array>} - Promise that resolves with array of image data
     */
    async function getAllImages() {
        if (!db) await initDatabase();
        
        return new Promise((resolve, reject) => {
            try {
                const transaction = db.transaction([IMAGES_STORE], 'readonly');
                const imageStore = transaction.objectStore(IMAGES_STORE);
                
                const request = imageStore.getAll();
                
                request.onsuccess = function() {
                    resolve(request.result || []);
                };
                
                request.onerror = function(event) {
                    console.error('Error getting all images:', event.target.error);
                    reject(event.target.error);
                };
            } catch (error) {
                console.error('Error in getAllImages:', error);
                reject(error);
            }
        });
    }
    
    /**
     * Get all images for a specific restaurant
     * @param {number} restaurantId - ID of the restaurant
     * @return {Promise<Array>} - Promise that resolves with array of image data
     */
    async function getRestaurantImages(restaurantId) {
        if (!db) await initDatabase();
        
        return new Promise((resolve, reject) => {
            try {
                const transaction = db.transaction([IMAGES_STORE], 'readonly');
                const imageStore = transaction.objectStore(IMAGES_STORE);
                const index = imageStore.index('restaurantId');
                
                const request = index.getAll(restaurantId);
                
                request.onsuccess = function() {
                    resolve(request.result || []);
                };
                
                request.onerror = function(event) {
                    console.error('Error getting restaurant images:', event.target.error);
                    reject(event.target.error);
                };
            } catch (error) {
                console.error('Error in getRestaurantImages:', error);
                reject(error);
            }
        });
    }
    
    /**
     * Delete all images for specific restaurants
     * @param {Array} restaurantIds - Array of restaurant IDs
     * @return {Promise} - Promise that resolves when images are deleted
     */
    async function deleteRestaurantImages(restaurantIds) {
        if (!db) await initDatabase();
        if (!Array.isArray(restaurantIds) || restaurantIds.length === 0) {
            return Promise.resolve(true);
        }
        
        return new Promise((resolve, reject) => {
            try {
                const transaction = db.transaction([IMAGES_STORE], 'readwrite');
                const imageStore = transaction.objectStore(IMAGES_STORE);
                const index = imageStore.index('restaurantId');
                const deletedImages = [];
                
                let completed = 0;
                let totalRequests = restaurantIds.length;
                
                transaction.oncomplete = function() {
                    console.log(`Deleted ${deletedImages.length} images for restaurants:`, restaurantIds);
                    resolve(deletedImages);
                };
                
                transaction.onerror = function(event) {
                    console.error('Error in transaction:', event.target.error);
                    reject(event.target.error);
                };
                
                // For each restaurant ID, find and delete associated images
                restaurantIds.forEach(restaurantId => {
                    const request = index.getAll(restaurantId);
                    
                    request.onsuccess = function() {
                        const images = request.result || [];
                        
                        images.forEach(image => {
                            const deleteRequest = imageStore.delete(image.id);
                            deleteRequest.onsuccess = function() {
                                deletedImages.push(image.id);
                            };
                        });
                        
                        completed++;
                    };
                });
            } catch (error) {
                console.error('Error in deleteRestaurantImages:', error);
                reject(error);
            }
        });
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
     * Count total images in the database
     * @return {Promise<number>} - Promise that resolves with the count
     */
    async function countImages() {
        if (!db) await initDatabase();
        
        return new Promise((resolve, reject) => {
            try {
                const transaction = db.transaction([IMAGES_STORE], 'readonly');
                const imageStore = transaction.objectStore(IMAGES_STORE);
                
                const request = imageStore.count();
                
                request.onsuccess = function() {
                    resolve(request.result || 0);
                };
                
                request.onerror = function(event) {
                    console.error('Error counting images:', event.target.error);
                    reject(event.target.error);
                };
            } catch (error) {
                console.error('Error in countImages:', error);
                reject(error);
            }
        });
    }

    // Public API
    return {
        initDatabase: initDatabase,
        storeImage: storeImage,
        getImage: getImage,
        deleteImage: deleteImage,
        getAllImages: getAllImages,
        getRestaurantImages: getRestaurantImages,
        deleteRestaurantImages: deleteRestaurantImages,
        getImageURL: getImageURL,
        countImages: countImages
    };
})();
