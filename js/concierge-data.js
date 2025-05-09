/**
 * concierge-data.js
 * 
 * Purpose: Core data management module for the Concierge Editor application.
 * Maintains a registry of entity models and coordinates database operations.
 * 
 * Dependencies: indexedDB-database.js - Requires IndexedDBManager class
 */

const ConciergeData = (() => {
  // Database constants
  const DB_NAME = 'concierge_db';
  const DB_VERSION = 1;
  
  // Registry of entity models
  const entityModels = {};
  
  // Combined database schema
  let combinedSchema = {
    name: DB_NAME,
    version: DB_VERSION,
    stores: {}
  };

  // Database instance holder
  let dbInstance = null;

  /**
   * Registers an entity model with the data manager
   * @param {string} entityType - Type identifier for the entity model
   * @param {Object} model - Model definition containing schema and operations
   */
  const registerModel = (entityType, model) => {
    if (entityModels[entityType]) {
      console.warn(`Model for ${entityType} is being replaced`);
    }
    
    // Store the model
    entityModels[entityType] = model;
    
    // Add schema to combined schema
    if (model.schema && model.schema.stores) {
      Object.keys(model.schema.stores).forEach(store => {
        combinedSchema.stores[store] = model.schema.stores[store];
      });
    }
    
    // Initialize the model if DB is already open
    if (dbInstance) {
      if (model.initialize && typeof model.initialize === 'function') {
        model.initialize(dbInstance);
      }
    }
  };

  /**
   * Gets or creates the database instance
   * @returns {IndexedDBManager} The database manager instance
   */
  const getDatabase = () => {
    if (!dbInstance) {
      if (!window.IndexedDBManager) {
        throw new Error('IndexedDBManager not found. Make sure indexedDB-database.js is loaded first.');
      }
      dbInstance = new IndexedDBManager(combinedSchema);
    }
    return dbInstance;
  };

  /**
   * Initializes the database and all registered entity models
   * @returns {Promise} Resolves when initialization is complete
   */
  const initialize = async () => {
    // Create and open database
    const db = getDatabase();
    await db.open();
    
    // Initialize all registered models
    const initPromises = Object.keys(entityModels).map(type => {
      const model = entityModels[type];
      if (model.initialize && typeof model.initialize === 'function') {
        return model.initialize(db);
      }
      return Promise.resolve();
    });
    
    await Promise.all(initPromises);
    return db;
  };

  /**
   * Data import/export operations
   */
  const dataOperations = {
    import: async (data) => {
      const db = getDatabase();
      await db.importData(data);
      
      // Notify all models about data import
      Object.keys(entityModels).forEach(type => {
        const model = entityModels[type];
        if (model.onDataImported && typeof model.onDataImported === 'function') {
          model.onDataImported(data);
        }
      });
    },
    
    export: async () => {
      const db = getDatabase();
      return await db.exportData();
    }
  };

  // Public API
  return {
    registerModel,
    initialize,
    getEntityModel: (type) => entityModels[type],
    getEntityTypes: () => Object.keys(entityModels),
    data: dataOperations,
    getDatabase,
    closeDatabase: () => {
      if (dbInstance) {
        dbInstance.close();
        dbInstance = null;
      }
    },
    deleteDatabase: async () => {
      if (dbInstance) {
        await dbInstance.delete();
        dbInstance = null;
      }
    }
  };
})();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ConciergeData;
} else {
  window.ConciergeData = ConciergeData;
}
