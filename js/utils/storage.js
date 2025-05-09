/**
 * Storage Module - Low-level database abstraction layer
 * Dependencies: idb library for IndexedDB interactions
 * Provides generic database operations without domain-specific knowledge
 */

const StorageModule = (function() {
    const DB_NAME = 'concierge-editor';
    const DB_VERSION = 2;
    
    // Object store names - these remain as constants for external reference
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
        await initDatabase();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(item);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
            
            transaction.oncomplete = () => {
                console.log(`Item saved in ${storeName}`);
            };
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
     * Delete an item from a store
     * @param {string} storeName - Name of the store
     * @param {string|number} id - ID of the item to delete
     * @return {Promise} - Promise that resolves when deletion is complete
     */
    async function deleteItem(storeName, id) {
        await initDatabase();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
    
    /**
     * Generic function to get all items from a store
     * @param {string} storeName - Name of the store
     * @return {Promise<Array>} - Promise that resolves with array of items
     */
    async function getAllItems(storeName) {
        try {
            await initDatabase();
            
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const request = store.getAll();
                
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error(`Error in getAllItems(${storeName}):`, error);
            return [];
        }
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
     * Run multiple operations in a single transaction
     * @param {Array<string>} storeNames - Names of stores to include in transaction
     * @param {string} mode - Transaction mode ('readonly' or 'readwrite')
     * @param {Function} callback - Function that performs operations on the transaction
     * @return {Promise} - Promise that resolves with the result of the callback
     */
    async function runTransaction(storeNames, mode, callback) {
        await initDatabase();
        
        return new Promise((resolve, reject) => {
            try {
                const transaction = db.transaction(storeNames, mode);
                let result;
                
                transaction.oncomplete = function() {
                    resolve(result);
                };
                
                transaction.onerror = function(event) {
                    console.error('Transaction error:', event.target.error);
                    reject(event.target.error);
                };
                
                // Allow transaction to be used by callback
                const stores = {};
                storeNames.forEach(name => {
                    stores[name] = transaction.objectStore(name);
                });
                
                try {
                    result = callback(stores, transaction);
                } catch (error) {
                    console.error('Error in transaction callback:', error);
                    transaction.abort();
                    reject(error);
                }
            } catch (error) {
                console.error('Error creating transaction:', error);
                reject(error);
            }
        });
    }
    
    /**
     * Get total count of items in a store
     * @param {string} storeName - Name of the store to count
     * @return {Promise<number>} - Promise that resolves with the count
     */
    async function countItems(storeName) {
        try {
            await initDatabase();
            
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const request = store.count();
                
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error(`Error in countItems(${storeName}):`, error);
            return 0;
        }
    }
    
    /**
     * Import data into multiple stores
     * @param {Object} data - Object containing arrays of items to import, keyed by store name
     * @return {Promise<Object>} - Promise that resolves with import statistics
     */
    async function importData(data) {
        if (!data || typeof data !== 'object') {
            return Promise.reject(new Error('Invalid import data'));
        }
        
        try {
            await initDatabase();
            const stats = {};
            
            // Import data to each store
            const promises = Object.keys(data).map(async storeName => {
                // Skip if not a valid store
                if (!STORES[storeName] && !Object.values(STORES).includes(storeName)) {
                    return;
                }
                
                // Skip if not an array
                if (!Array.isArray(data[storeName])) {
                    return;
                }
                
                // Merge with existing data
                const existingItems = await getAllItems(storeName);
                const itemMap = new Map();
                
                // Add existing items to map
                existingItems.forEach(item => {
                    if (item.id) {
                        itemMap.set(item.id, item);
                    }
                });
                
                // Update/add new items
                data[storeName].forEach(item => {
                    if (item.id) {
                        itemMap.set(item.id, item);
                    }
                });
                
                // Convert map back to array
                const mergedItems = Array.from(itemMap.values());
                
                // Save batch
                await saveBatch(storeName, mergedItems);
                
                // Track stats
                stats[storeName] = data[storeName].length;
            });
            
            await Promise.all(promises);
            
            return { 
                success: true,
                message: 'Data imported successfully',
                stats
            };
        } catch (error) {
            console.error('Error importing data:', error);
            return Promise.reject(new Error(`Import failed: ${error.message}`));
        }
    }
    
    /**
     * Export all data from all stores
     * @param {Array<string>} [storeNames] - Optional specific stores to export (defaults to all)
     * @return {Promise<Object>} - Promise that resolves with exported data
     */
    async function exportData(storeNames) {
        try {
            await initDatabase();
            
            // Use provided store names or all stores
            const storesToExport = storeNames || Object.values(STORES);
            
            // Export each store
            const exportPromises = storesToExport.map(async storeName => {
                const items = await getAllItems(storeName);
                return [storeName, items];
            });
            
            const exportedArrays = await Promise.all(exportPromises);
            
            // Convert to object
            const exportedData = Object.fromEntries(exportedArrays);
            
            return exportedData;
        } catch (error) {
            console.error('Error exporting data:', error);
            return Promise.reject(new Error(`Export failed: ${error.message}`));
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
        runTransaction,
        
        // Import/Export
        importData,
        exportData,
        
        // Store constants for external reference
        STORES
    };
})();
