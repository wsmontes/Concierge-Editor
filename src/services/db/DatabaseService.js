/**
 * Core database service using Dexie.js for IndexedDB
 * Handles database initialization, versioning, and error recovery
 * 
 * @module DatabaseService
 */

import Dexie from 'dexie';

class DatabaseService {
  constructor() {
    this.dbName = 'RestaurantCurator';
    this.db = null;
    this.isResetting = false;
    this.initializeDatabase();
  }

  /**
   * Initialize the database with the current schema
   */
  initializeDatabase() {
    try {
      console.log('DatabaseService: Initializing database...');
      
      // Close any existing instance
      if (this.db) {
        this.db.close();
        this.db = null;
      }
      
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
      this.db.open().catch(error => {
        console.error('DatabaseService: Failed to open database:', error);
        
        // Reset if schema error or corruption detected
        if (error.name === 'VersionError' || 
            error.name === 'InvalidStateError' || 
            error.name === 'NotFoundError') {
          console.warn('DatabaseService: Database schema issue detected, attempting reset...');
          this.resetDatabase();
        }
      });

      console.log('DatabaseService: Database initialized successfully');
    } catch (error) {
      console.error('DatabaseService: Error initializing database:', error);
      this.resetDatabase();
    }
  }

  /**
   * Reset the database in case of critical errors
   * @returns {Promise<boolean>} Success status
   */
  async resetDatabase() {
    console.warn('DatabaseService: Resetting database...');
    try {
      this.isResetting = true;
      
      // Close current connection if exists
      if (this.db) {
        this.db.close();
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
      this.initializeDatabase();
    }
    return this.db;
  }
}

// Create and export singleton instance
const databaseService = new DatabaseService();
export default databaseService;
