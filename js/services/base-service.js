/**
 * Base Service - Foundation class for all entity services
 * Dependencies: StorageModule, ValidationService, ErrorHandlingService
 * Provides common CRUD operations and utility methods for entity services
 */

const BaseService = (function() {
    /**
     * Create a BaseService instance for an entity type
     * @param {string} storeName - IndexedDB store name for the entity
     * @param {string} entityName - Human-readable entity name for messages
     * @param {Function} validateFunction - Validation function from ValidationService
     * @return {Object} - Service instance with standard CRUD methods
     */
    function createService(storeName, entityName, validateFunction = null) {
        /**
         * Get all entities from storage
         * @returns {Promise<Array>} - Promise resolving to array of entities
         */
        async function getAll() {
            try {
                return await StorageModule.getAllItems(storeName);
            } catch (error) {
                ErrorHandlingService.handleError(error, `Getting all ${entityName}`);
                return [];
            }
        }
        
        /**
         * Get entity by ID
         * @param {number} id - Entity ID
         * @returns {Promise<Object|null>} - Promise resolving to entity or null if not found
         */
        async function getById(id) {
            try {
                return await StorageModule.getItem(storeName, parseInt(id));
            } catch (error) {
                ErrorHandlingService.handleError(error, `Getting ${entityName} by ID ${id}`);
                return null;
            }
        }
        
        /**
         * Create a new entity
         * @param {Object} data - Entity data
         * @returns {Promise<Object>} - Promise resolving to created entity
         */
        async function create(data) {
            try {
                // Validate if validation function provided
                if (validateFunction) {
                    const validationResult = validateFunction(data);
                    if (!validationResult.valid) {
                        throw new Error(`Invalid ${entityName}: ${validationResult.errors.join(', ')}`);
                    }
                }
                
                // Ensure entity has timestamp
                if (!data.timestamp) {
                    data.timestamp = new Date().toISOString();
                }
                
                // Assign ID if not present
                if (!data.id) {
                    data.id = Date.now();
                }
                
                // Save to storage
                await StorageModule.saveItem(storeName, data);
                return data;
            } catch (error) {
                ErrorHandlingService.handleError(error, `Creating ${entityName}`);
                throw error;
            }
        }
        
        /**
         * Update an entity
         * @param {number} id - Entity ID
         * @param {Object} data - Updated entity data
         * @returns {Promise<Object>} - Promise resolving to updated entity
         */
        async function update(id, data) {
            try {
                // Get existing entity
                const existing = await getById(id);
                if (!existing) {
                    throw new Error(`${entityName} with ID ${id} not found`);
                }
                
                // Merge data
                const updated = { ...existing, ...data };
                
                // Validate if validation function provided
                if (validateFunction) {
                    const validationResult = validateFunction(updated);
                    if (!validationResult.valid) {
                        throw new Error(`Invalid ${entityName}: ${validationResult.errors.join(', ')}`);
                    }
                }
                
                // Save to storage
                await StorageModule.saveItem(storeName, updated);
                return updated;
            } catch (error) {
                ErrorHandlingService.handleError(error, `Updating ${entityName} ${id}`);
                throw error;
            }
        }
        
        /**
         * Delete an entity
         * @param {number} id - Entity ID
         * @returns {Promise<boolean>} - Promise resolving to success flag
         */
        async function deleteEntity(id) {
            try {
                await StorageModule.deleteItem(storeName, parseInt(id));
                return true;
            } catch (error) {
                ErrorHandlingService.handleError(error, `Deleting ${entityName} ${id}`);
                return false;
            }
        }
        
        /**
         * Delete multiple entities
         * @param {Array<number>} ids - Array of entity IDs
         * @returns {Promise<number>} - Promise resolving to count of deleted entities
         */
        async function deleteMany(ids) {
            try {
                let count = 0;
                for (const id of ids) {
                    try {
                        await StorageModule.deleteItem(storeName, parseInt(id));
                        count++;
                    } catch (innerError) {
                        console.warn(`Error deleting ${entityName} ${id}:`, innerError);
                    }
                }
                return count;
            } catch (error) {
                ErrorHandlingService.handleError(error, `Deleting multiple ${entityName}`);
                return 0;
            }
        }
        
        /**
         * Count all entities in store
         * @returns {Promise<number>} - Promise resolving to count
         */
        async function count() {
            try {
                return await StorageModule.countItems(storeName);
            } catch (error) {
                ErrorHandlingService.handleError(error, `Counting ${entityName}`);
                return 0;
            }
        }
        
        /**
         * Import multiple entities
         * @param {Array<Object>} items - Entities to import
         * @returns {Promise<number>} - Promise resolving to count of imported entities
         */
        async function importAll(items) {
            try {
                if (!Array.isArray(items) || items.length === 0) {
                    return 0;
                }
                
                // Add timestamp if missing
                const now = new Date().toISOString();
                const preparedItems = items.map(item => ({
                    ...item,
                    timestamp: item.timestamp || now
                }));
                
                // Save batch
                await StorageModule.saveBatch(storeName, preparedItems);
                return preparedItems.length;
            } catch (error) {
                ErrorHandlingService.handleError(error, `Importing ${entityName}`);
                throw error;
            }
        }
        
        // Return service interface
        return {
            getAll,
            getById,
            create,
            update,
            delete: deleteEntity, // Use 'delete' as the public name
            deleteMany,
            count,
            importAll
        };
    }
    
    // Public API
    return {
        createService
    };
})();
