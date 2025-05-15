/**
 * Core database service using Dexie.js for IndexedDB
 * Handles database initialization, versioning, and error recovery
 * 
 * @module DatabaseService
 */

class DatabaseService {
  constructor() {
    this.dbName = 'RestaurantCurator';
    this.db = null;
    this.isResetting = false;
    this.isInitialized = false;
    this.initializePromise = null;
    this.initializeDatabase();
  }

  /**
   * Initialize the database with the current schema
   * Returns a promise that resolves when initialization is complete
   * @returns {Promise}
   */
  initializeDatabase() {
    // If initialization is already in progress, return that promise
    if (this.initializePromise) {
      return this.initializePromise;
    }
    
    // If database is already initialized, just return a resolved promise
    if (this.isInitialized && this.db && this.db.isOpen()) {
      return Promise.resolve(this.db);
    }
    
    console.log('DatabaseService: Initializing database...');
    
    this.initializePromise = new Promise((resolve, reject) => {
      try {
        // Use the globally available Dexie from the script tag
        if (typeof Dexie === 'undefined') {
          console.error('DatabaseService: Dexie is not defined. Make sure the Dexie.js script is loaded.');
          reject(new Error('Dexie is not defined'));
          return;
        }
        
        // Close any existing instance properly
        if (this.db) {
          try {
            if (this.db.isOpen()) {
              this.db.close();
            }
          } catch (closeError) {
            console.warn('DatabaseService: Error closing previous database instance:', closeError);
          }
          this.db = null;
        }
        
        // Create new Dexie instance
        this.db = new Dexie(this.dbName);
        
        // Define database schema (version 6)
        this.db.version(6).stores({
          curators: '++id, name, lastActive, serverId, origin',
          concepts: '++id, category, value, timestamp, [category+value]',
          restaurants: '++id, name, curatorId, timestamp, transcription, description, origin, source, serverId',
          restaurantConcepts: '++id, restaurantId, conceptId',
          restaurantPhotos: '++id, restaurantId, photoData',
          restaurantLocations: '++id, restaurantId, latitude, longitude, address',
          settings: 'key'
        });

        // Open the database to ensure proper initialization
        this.db.open().then(() => {
          console.log('DatabaseService: Database initialized successfully');
          this.isInitialized = true;
          this.initializePromise = null;
          resolve(this.db);
        }).catch(error => {
          console.error('DatabaseService: Failed to open database:', error);
          
          // Reset if schema error or corruption detected
          if (error.name === 'VersionError' || 
              error.name === 'InvalidStateError' || 
              error.name === 'NotFoundError') {
            console.warn('DatabaseService: Database schema issue detected, attempting reset...');
            this.resetDatabase()
              .then(() => resolve(this.db))
              .catch(resetError => reject(resetError));
          } else {
            reject(error);
          }
        });
      } catch (error) {
        console.error('DatabaseService: Error initializing database:', error);
        this.initializePromise = null;
        
        this.resetDatabase()
          .then(() => resolve(this.db))
          .catch(resetError => reject(resetError));
      }
    });
    
    return this.initializePromise;
  }

  /**
   * Reset the database in case of critical errors
   * @returns {Promise<boolean>} Success status
   */
  async resetDatabase() {
    console.warn('DatabaseService: Resetting database...');
    try {
      if (this.isResetting) {
        // If reset is already in progress, wait a bit and return
        return new Promise(resolve => setTimeout(() => resolve(true), 500));
      }
      
      this.isResetting = true;
      
      // Close current connection if exists
      if (this.db) {
        try {
          if (this.db.isOpen()) {
            this.db.close();
          }
        } catch (closeError) {
          console.warn('DatabaseService: Error closing database during reset:', closeError);
        }
        this.db = null;
      }
      
      // Delete the database
      await Dexie.delete(this.dbName);
      
      // Show notification to the user
      this._showResetNotification();
      
      // Reinitialize with fresh schema
      this.db = new Dexie(this.dbName);
      this.db.version(6).stores({
        curators: '++id, name, lastActive, serverId, origin',
        concepts: '++id, category, value, timestamp, [category+value]',
        restaurants: '++id, name, curatorId, timestamp, transcription, description, origin, source, serverId',
        restaurantConcepts: '++id, restaurantId, conceptId',
        restaurantPhotos: '++id, restaurantId, photoData',
        restaurantLocations: '++id, restaurantId, latitude, longitude, address',
        settings: 'key'
      });
      
      await this.db.open();
      console.log('DatabaseService: Database reset and reinitialized successfully');
      
      this.isResetting = false;
      this.isInitialized = true;
      return true;
    } catch (error) {
      this.isResetting = false;
      console.error('DatabaseService: Failed to reset database:', error);
      alert('A critical database error has occurred. Please reload the page or clear your browser data.');
      return false;
    }
  }
  
  /**
   * Show notification about database reset
   * @private
   */
  _showResetNotification() {
    if (typeof Toastify !== 'undefined') {
      Toastify({
        text: "Database has been reset due to schema issues. Your data has been cleared.",
        duration: 5000,
        gravity: "top",
        position: "center",
        style: { background: "linear-gradient(to right, #ff5f6d, #ffc371)" }
      }).showToast();
    }
  }

  /**
   * Get the database instance
   * @returns {Dexie} The Dexie database instance
   */
  getDatabase() {
    if (!this.db || !this.db.isOpen()) {
      // Don't create a new instance immediately, return a promise that resolves to the db
      return this.initializeDatabase().then(() => this.db);
    }
    return this.db;
  }
  
  /**
   * Make sure database is initialized and ready for use
   * @returns {Promise<Dexie>} Promise resolving to database instance
   */
  async ensureDatabase() {
    if (this.isInitialized && this.db && this.db.isOpen()) {
      return this.db;
    }
    return this.initializeDatabase();
  }
}

// Create and export singleton instance
const databaseService = new DatabaseService();
export default databaseService;
