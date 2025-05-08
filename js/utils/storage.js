/**
 * Storage Module - Provides storage mechanisms for application data and images
 * Dependencies: IndexedDB (via idb library)
 */

const StorageModule = (function() {
    // Database name and version
    const DB_NAME = 'conciergeEditorDB';
    const DB_VERSION = 1;
    
    // Store names
    const IMAGES_STORE = 'images';
    
    let db;
    
    /**
     * Initialize the database
     * @return {Promise} - Resolves when the database is ready
     */
    async function initDatabase() {
        if (db) return db;
        
        db = await idb.openDB(DB_NAME, DB_VERSION, {
            upgrade(db) {
                // Create images object store
                if (!db.objectStoreNames.contains(IMAGES_STORE)) {
                    const imageStore = db.createObjectStore(IMAGES_STORE, { keyPath: 'id' });
                    imageStore.createIndex('restaurantId', 'restaurantId');
                }
            }
        });
        
        return db;
    }
    
    /**
     * Store an image in the database
     * @param {Object} imageData - The image data to store
     * @param {string} imageData.id - Unique identifier for the image
     * @param {number} imageData.restaurantId - ID of the restaurant this image belongs to
     * @param {string} imageData.photoDataRef - Original reference from the import data
     * @param {Blob} imageData.blob - The image data as a Blob
     * @return {Promise} - Resolves when the image is stored
     */
    async function storeImage(imageData) {
        const database = await initDatabase();
        return database.put(IMAGES_STORE, imageData);
    }
    
    /**
     * Get an image from the database
     * @param {string} id - The ID of the image to retrieve
     * @return {Promise<Object>} - Resolves with the image data
     */
    async function getImage(id) {
        const database = await initDatabase();
        return database.get(IMAGES_STORE, id);
    }
    
    /**
     * Delete an image from the database
     * @param {string} id - The ID of the image to delete
     * @return {Promise} - Resolves when the image is deleted
     */
    async function deleteImage(id) {
        const database = await initDatabase();
        return database.delete(IMAGES_STORE, id);
    }
    
    /**
     * Get all images from the database
     * @return {Promise<Array>} - Resolves with an array of all image data objects
     */
    async function getAllImages() {
        const database = await initDatabase();
        return database.getAll(IMAGES_STORE);
    }
    
    /**
     * Get all images for a specific restaurant
     * @param {number} restaurantId - The ID of the restaurant
     * @return {Promise<Array>} - Resolves with an array of image data objects
     */
    async function getRestaurantImages(restaurantId) {
        const database = await initDatabase();
        return database.getAllFromIndex(IMAGES_STORE, 'restaurantId', Number(restaurantId));
    }
    
    /**
     * Delete images for specific restaurants
     * @param {Array} restaurantIds - Array of restaurant IDs
     * @return {Promise} - Resolves when images are deleted
     */
    async function deleteRestaurantImages(restaurantIds) {
        const database = await initDatabase();
        const tx = database.transaction(IMAGES_STORE, 'readwrite');
        
        // Get all images for these restaurants
        const promises = [];
        for (const restaurantId of restaurantIds) {
            const images = await tx.store.index('restaurantId').getAll(Number(restaurantId));
            for (const image of images) {
                promises.push(tx.store.delete(image.id));
            }
        }
        
        await Promise.all(promises);
        await tx.done;
    }
    
    /**
     * Create an object URL for an image
     * @param {string} id - The ID of the image
     * @return {Promise<string>} - Resolves with the object URL
     */
    async function getImageURL(id) {
        const image = await getImage(id);
        if (image && image.blob) {
            return URL.createObjectURL(image.blob);
        }
        return null;
    }
    
    /**
     * Count the total number of stored images
     * @return {Promise<number>} - Resolves with the count of images
     */
    async function countImages() {
        const database = await initDatabase();
        return database.count(IMAGES_STORE);
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
