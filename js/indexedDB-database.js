/**
 * indexedDB-database.js
 * 
 * Purpose: Generic IndexedDB manager capable of handling any data structure.
 * Provides core database operations independent of specific data models.
 * 
 * Dependencies: None - Pure JavaScript using native IndexedDB API
 */

class IndexedDBManager {
  /**
   * Creates a new IndexedDB manager instance
   * @param {Object} config - Database configuration object
   * @param {string} config.name - The name of the database
   * @param {number} config.version - The version of the database
   * @param {Object} config.stores - Object store definitions
   */
  constructor(config) {
    if (!config || !config.name || !config.version || !config.stores) {
      throw new Error('Invalid database configuration');
    }
    
    this.dbName = config.name;
    this.dbVersion = config.version;
    this.storeDefinitions = config.stores;
    this.storeNames = Object.keys(config.stores);
    this.db = null;
  }

  /**
   * Opens a connection to the database
   * @returns {Promise} Resolves with the database connection or rejects with error
   */
  open() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        resolve(this.db);
        return;
      }

      if (!window.indexedDB) {
        reject(new Error('Your browser doesn\'t support IndexedDB. Please use a modern browser.'));
        return;
      }

      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = (event) => {
        reject(new Error(`Database error: ${event.target.errorCode}`));
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        console.log(`Database connection to ${this.dbName} established successfully`);
        resolve(this.db);
      };

      // Set up the database schema when creating/upgrading
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object stores based on configuration
        for (const storeName of this.storeNames) {
          const storeConfig = this.storeDefinitions[storeName];
          
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(
              storeName, 
              { 
                keyPath: storeConfig.keyPath, 
                autoIncrement: storeConfig.autoIncrement || false 
              }
            );
            
            // Create indices
            if (storeConfig.indices) {
              for (const index of storeConfig.indices) {
                store.createIndex(
                  index.name,
                  index.keyPath,
                  { unique: index.unique || false }
                );
              }
            }
          }
        }
        
        console.log(`${this.dbName} schema created successfully`);
      };
    });
  }

  /**
   * Closes the database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log(`Database connection to ${this.dbName} closed`);
    }
  }

  /**
   * Gets a list of all databases in the browser
   * @returns {Promise<Array>} List of database information
   */
  static listDatabases() {
    return new Promise((resolve, reject) => {
      if (!indexedDB.databases) {
        reject(new Error('Your browser doesn\'t support indexedDB.databases()'));
        return;
      }
      
      indexedDB.databases().then(dbs => {
        resolve(dbs);
      }).catch(error => {
        reject(error);
      });
    });
  }

  /**
   * Deletes the database entirely
   * @returns {Promise} Resolves when deletion is complete
   */
  delete() {
    return new Promise((resolve, reject) => {
      // Close connection first
      this.close();
      
      const request = indexedDB.deleteDatabase(this.dbName);
      
      request.onsuccess = () => {
        console.log(`Database ${this.dbName} deleted successfully`);
        resolve();
      };
      
      request.onerror = (event) => {
        reject(new Error(`Error deleting database: ${event.target.error}`));
      };
    });
  }

  /**
   * Imports data into the database
   * @param {Object} data - Data object with collections to import
   * @returns {Promise} Resolves when import completes
   */
  async importData(data) {
    try {
      await this.open();
      
      return new Promise((resolve, reject) => {
        // Validate data structure
        if (!data || typeof data !== 'object') {
          reject(new Error('Invalid data format'));
          return;
        }

        // Create collections array from data
        const collections = this.storeNames
          .filter(store => Array.isArray(data[store]))
          .map(store => ({ name: store, data: data[store] }));
        
        // If no valid collections found
        if (collections.length === 0) {
          reject(new Error('No valid data collections found'));
          return;
        }

        // Create transaction for all stores
        const storeNames = collections.map(col => col.name);
        const transaction = this.db.transaction(storeNames, 'readwrite');
        
        transaction.onerror = (event) => {
          reject(new Error(`Transaction error: ${event.target.error}`));
        };
        
        transaction.oncomplete = () => {
          console.log('Data import completed successfully');
          resolve();
        };

        // Clear and add data to each store
        collections.forEach(({ name, data }) => {
          const store = transaction.objectStore(name);
          
          // Clear existing data
          const clearRequest = store.clear();
          
          clearRequest.onsuccess = () => {
            // Add new data
            data.forEach(item => {
              store.add(item);
            });
          };
        });
      });
    } catch (error) {
      console.error('Error importing data:', error);
      throw error;
    }
  }

  /**
   * Exports all data from the database as an object
   * @returns {Promise<Object>} Resolves with the exported data
   */
  async exportData() {
    try {
      await this.open();
      
      const result = {};
      
      // Create promises for each object store
      const promises = this.storeNames.map(storeName => {
        return new Promise((resolve, reject) => {
          const transaction = this.db.transaction(storeName, 'readonly');
          const store = transaction.objectStore(storeName);
          const request = store.getAll();
          
          request.onsuccess = () => {
            result[storeName] = request.result;
            resolve();
          };
          
          request.onerror = (event) => {
            reject(new Error(`Error reading ${storeName}: ${event.target.error}`));
          };
        });
      });
      
      // Wait for all data to be retrieved
      await Promise.all(promises);
      return result;
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  }

  /**
   * Gets all records from a store
   * @param {string} storeName - Name of the store to query
   * @returns {Promise<Array>} Resolves with array of records
   */
  async getAll(storeName) {
    try {
      await this.open();
      
      return new Promise((resolve, reject) => {
        if (!this.storeNames.includes(storeName)) {
          reject(new Error(`Store "${storeName}" not found`));
          return;
        }
        
        const transaction = this.db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        
        request.onsuccess = () => {
          resolve(request.result);
        };
        
        request.onerror = (event) => {
          reject(new Error(`Error reading from store: ${event.target.error}`));
        };
      });
    } catch (error) {
      console.error(`Error getting data from ${storeName}:`, error);
      throw error;
    }
  }

  /**
   * Gets a record by its ID
   * @param {string} storeName - Name of the store to query
   * @param {*} id - ID of the record to get
   * @returns {Promise<Object>} Resolves with the record or null if not found
   */
  async getById(storeName, id) {
    try {
      await this.open();
      
      return new Promise((resolve, reject) => {
        if (!this.storeNames.includes(storeName)) {
          reject(new Error(`Store "${storeName}" not found`));
          return;
        }
        
        const transaction = this.db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(id);
        
        request.onsuccess = () => {
          resolve(request.result || null);
        };
        
        request.onerror = (event) => {
          reject(new Error(`Error getting record: ${event.target.error}`));
        };
      });
    } catch (error) {
      console.error(`Error getting record from ${storeName}:`, error);
      throw error;
    }
  }

  /**
   * Adds a record to a store
   * @param {string} storeName - Name of the store
   * @param {Object} data - Data to add
   * @returns {Promise<number>} Resolves with the ID of the new record
   */
  async add(storeName, data) {
    try {
      await this.open();
      
      return new Promise((resolve, reject) => {
        if (!this.storeNames.includes(storeName)) {
          reject(new Error(`Store "${storeName}" not found`));
          return;
        }
        
        const transaction = this.db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.add(data);
        
        request.onsuccess = () => {
          resolve(request.result);
        };
        
        request.onerror = (event) => {
          reject(new Error(`Error adding record: ${event.target.error}`));
        };
      });
    } catch (error) {
      console.error(`Error adding to ${storeName}:`, error);
      throw error;
    }
  }

  /**
   * Updates a record in a store
   * @param {string} storeName - Name of the store
   * @param {Object} data - Data to update (must include the keyPath field)
   * @returns {Promise<void>} Resolves when update completes
   */
  async update(storeName, data) {
    try {
      await this.open();
      
      return new Promise((resolve, reject) => {
        if (!this.storeNames.includes(storeName)) {
          reject(new Error(`Store "${storeName}" not found`));
          return;
        }
        
        const storeConfig = this.storeDefinitions[storeName];
        if (!data[storeConfig.keyPath]) {
          reject(new Error(`Data missing required key "${storeConfig.keyPath}"`));
          return;
        }
        
        const transaction = this.db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(data);
        
        request.onsuccess = () => {
          resolve();
        };
        
        request.onerror = (event) => {
          reject(new Error(`Error updating record: ${event.target.error}`));
        };
      });
    } catch (error) {
      console.error(`Error updating in ${storeName}:`, error);
      throw error;
    }
  }

  /**
   * Deletes a record from a store
   * @param {string} storeName - Name of the store
   * @param {*} id - ID of the record to delete
   * @returns {Promise<void>} Resolves when deletion completes
   */
  async delete(storeName, id) {
    try {
      await this.open();
      
      return new Promise((resolve, reject) => {
        if (!this.storeNames.includes(storeName)) {
          reject(new Error(`Store "${storeName}" not found`));
          return;
        }
        
        const transaction = this.db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(id);
        
        request.onsuccess = () => {
          resolve();
        };
        
        request.onerror = (event) => {
          reject(new Error(`Error deleting record: ${event.target.error}`));
        };
      });
    } catch (error) {
      console.error(`Error deleting from ${storeName}:`, error);
      throw error;
    }
  }

  /**
   * Queries records using an index
   * @param {string} storeName - Name of the store
   * @param {string} indexName - Name of the index to use
   * @param {*} value - Value to search for
   * @returns {Promise<Array>} Resolves with matching records
   */
  async queryByIndex(storeName, indexName, value) {
    try {
      await this.open();
      
      return new Promise((resolve, reject) => {
        if (!this.storeNames.includes(storeName)) {
          reject(new Error(`Store "${storeName}" not found`));
          return;
        }
        
        const transaction = this.db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        
        // Check if index exists
        if (!store.indexNames.contains(indexName)) {
          reject(new Error(`Index "${indexName}" not found in store "${storeName}"`));
          return;
        }
        
        const index = store.index(indexName);
        const request = index.getAll(value);
        
        request.onsuccess = () => {
          resolve(request.result);
        };
        
        request.onerror = (event) => {
          reject(new Error(`Error querying by index: ${event.target.error}`));
        };
      });
    } catch (error) {
      console.error(`Error querying ${storeName} by index ${indexName}:`, error);
      throw error;
    }
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = IndexedDBManager;
} else {
  window.IndexedDBManager = IndexedDBManager;
}