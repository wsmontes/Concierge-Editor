/**
 * Base Service - Foundation for all entity services
 * Dependencies: StorageModule for data persistence
 * Provides common data operations and error handling for specific entity services
 */

class BaseService {
    /**
     * Initialize the base service
     * @param {string} storeName - Name of the primary store this service manages
     */
    constructor(storeName) {
        if (!storeName) {
            throw new Error('Store name must be provided to BaseService');
        }
        
        this.storeName = storeName;
    }
    
    /**
     * Get all entities from the store
     * @return {Promise<Array>} - Promise that resolves with array of entities
     */
    async getAll() {
        try {
            return await StorageModule.getAllItems(this.storeName);
        } catch (error) {
            console.error(`Error getting all items from ${this.storeName}:`, error);
            throw new Error(`Failed to get ${this.storeName}: ${error.message}`);
        }
    }
    
    /**
     * Get an entity by ID
     * @param {string|number} id - ID of the entity to retrieve
     * @return {Promise<Object>} - Promise that resolves with the entity
     */
    async getById(id) {
        try {
            const entity = await StorageModule.getItem(this.storeName, id);
            if (!entity) {
                throw new Error(`${this.storeName} with ID ${id} not found`);
            }
            return entity;
        } catch (error) {
            console.error(`Error getting ${this.storeName} ${id}:`, error);
            throw new Error(`Failed to get ${this.storeName}: ${error.message}`);
        }
    }
    
    /**
     * Create a new entity
     * @param {Object} data - Entity data
     * @return {Promise<Object>} - Promise that resolves with the created entity
     */
    async create(data) {
        try {
            // Generate ID if not provided
            const entityData = { ...data };
            if (!entityData.id) {
                entityData.id = Date.now();
            }
            
            // Add timestamp if not provided
            if (!entityData.timestamp) {
                entityData.timestamp = new Date().toISOString();
            }
            
            const id = await StorageModule.saveItem(this.storeName, entityData);
            return { ...entityData, id };
        } catch (error) {
            console.error(`Error creating ${this.storeName}:`, error);
            throw new Error(`Failed to create ${this.storeName}: ${error.message}`);
        }
    }
    
    /**
     * Update an existing entity
     * @param {string|number} id - ID of the entity to update
     * @param {Object} data - Updated entity data
     * @return {Promise<Object>} - Promise that resolves with the updated entity
     */
    async update(id, data) {
        try {
            // Get existing entity
            const existingEntity = await StorageModule.getItem(this.storeName, id);
            if (!existingEntity) {
                throw new Error(`${this.storeName} with ID ${id} not found`);
            }
            
            // Merge data, preserving ID
            const updatedEntity = {
                ...existingEntity,
                ...data,
                id,
                lastModified: new Date().toISOString()
            };
            
            await StorageModule.saveItem(this.storeName, updatedEntity);
            return updatedEntity;
        } catch (error) {
            console.error(`Error updating ${this.storeName} ${id}:`, error);
            throw new Error(`Failed to update ${this.storeName}: ${error.message}`);
        }
    }
    
    /**
     * Delete an entity
     * @param {string|number} id - ID of the entity to delete
     * @return {Promise<boolean>} - Promise that resolves with true if successful
     */
    async delete(id) {
        try {
            await StorageModule.deleteItem(this.storeName, id);
            return true;
        } catch (error) {
            console.error(`Error deleting ${this.storeName} ${id}:`, error);
            throw new Error(`Failed to delete ${this.storeName}: ${error.message}`);
        }
    }
    
    /**
     * Get entities by a specific index value
     * @param {string} indexName - Name of the index to query
     * @param {*} indexValue - Value to search for
     * @return {Promise<Array>} - Promise that resolves with matching entities
     */
    async getByIndex(indexName, indexValue) {
        try {
            return await StorageModule.getItemsByIndex(this.storeName, indexName, indexValue);
        } catch (error) {
            console.error(`Error getting ${this.storeName} by ${indexName}:`, error);
            throw new Error(`Failed to query ${this.storeName}: ${error.message}`);
        }
    }
    
    /**
     * Count entities in the store
     * @return {Promise<number>} - Promise that resolves with the count
     */
    async count() {
        try {
            return await StorageModule.countItems(this.storeName);
        } catch (error) {
            console.error(`Error counting ${this.storeName}:`, error);
            return 0;
        }
    }
    
    /**
     * Save multiple entities in a batch
     * @param {Array<Object>} entities - Array of entities to save
     * @return {Promise<Array>} - Promise that resolves with array of saved entity IDs
     */
    async saveBatch(entities) {
        try {
            return await StorageModule.saveBatch(this.storeName, entities);
        } catch (error) {
            console.error(`Error batch saving ${this.storeName}:`, error);
            throw new Error(`Failed to save ${this.storeName} batch: ${error.message}`);
        }
    }
    
    /**
     * Clear all entities from the store
     * @return {Promise<boolean>} - Promise that resolves with true if successful
     */
    async clearAll() {
        try {
            return await StorageModule.clearStore(this.storeName);
        } catch (error) {
            console.error(`Error clearing ${this.storeName}:`, error);
            throw new Error(`Failed to clear ${this.storeName}: ${error.message}`);
        }
    }
}

// Export as both a class and a factory function for flexibility
const BaseServiceFactory = {
    /**
     * Create a new instance of BaseService
     * @param {string} storeName - Name of the store
     * @return {BaseService} New service instance
     */
    create: function(storeName) {
        return new BaseService(storeName);
    }
};
