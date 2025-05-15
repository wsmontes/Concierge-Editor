/**
 * Repository for curator-related operations
 * Provides methods to create, retrieve, and manage curators
 * 
 * @module CuratorRepository
 * @depends DatabaseService, SettingsService
 */

import databaseService from '../services/db/DatabaseService.js';
import settingsService from '../services/SettingsService.js';

class CuratorRepository {
  constructor() {
    this.db = null;
    this._initializeDb();
  }
  
  /**
   * Initialize database reference
   * @private
   */
  async _initializeDb() {
    try {
      this.db = await databaseService.ensureDatabase();
    } catch (error) {
      console.error('CuratorRepository: Error initializing database:', error);
    }
  }

  /**
   * Save a curator
   * @param {string} name - Curator name
   * @param {string} apiKey - OpenAI API key (for local curators only)
   * @param {string} origin - Data origin ('local' or 'remote')
   * @param {number|null} serverId - Server ID for remote curators
   * @returns {Promise<number>} Curator ID
   */
  async saveCurator(name, apiKey = null, origin = 'local', serverId = null) {
    try {
      console.log(`CuratorRepository: Saving curator with name: ${name}, origin: ${origin}`);
      
      // Make sure database is initialized
      if (!this.db) {
        await this._initializeDb();
      }
      
      // Save curator to database with origin and serverId
      const curatorId = await this.db.curators.put({
        name,
        lastActive: new Date(),
        origin,
        serverId
      });
      
      // Store API key in localStorage for local-only curators
      if (origin === 'local' && apiKey) {
        localStorage.setItem('openai_api_key', apiKey);
      }
      
      console.log(`CuratorRepository: Curator saved successfully with ID: ${curatorId}`);
      return curatorId;
    } catch (error) {
      console.error('CuratorRepository: Error saving curator:', error);
      throw error;
    }
  }

  /**
   * Get the current active curator
   * @returns {Promise<Object|null>} Curator object or null
   */
  async getCurrentCurator() {
    try {
      // First try to get from settings
      const curatorId = await settingsService.getSetting('currentCurator');
      if (curatorId) {
        const curator = await this.db.curators.get(curatorId);
        if (curator) return curator;
      }
      
      // Fallback to most recently active
      const curators = await this.db.curators.orderBy('lastActive').reverse().limit(1).toArray();
      return curators.length > 0 ? curators[0] : null;
    } catch (error) {
      console.error('CuratorRepository: Error getting current curator:', error);
      return null;
    }
  }

  /**
   * Set the current active curator
   * @param {number} curatorId - Curator ID
   * @returns {Promise<void>}
   */
  async setCurrentCurator(curatorId) {
    try {
      // Update settings
      await settingsService.updateSetting('currentCurator', curatorId);
      
      // Update activity timestamp
      await this.db.curators.update(curatorId, {
        lastActive: new Date()
      });
      
      console.log(`CuratorRepository: Current curator set to ID: ${curatorId}`);
    } catch (error) {
      console.error('CuratorRepository: Error setting current curator:', error);
      throw error;
    }
  }

  /**
   * Update curator activity timestamp
   * @param {number} curatorId - Curator ID
   * @returns {Promise<void>}
   */
  async updateCuratorActivity(curatorId) {
    try {
      await this.db.curators.update(curatorId, { lastActive: new Date() });
    } catch (error) {
      console.error('CuratorRepository: Error updating curator activity:', error);
      throw error;
    }
  }

  /**
   * Get all curators with deduplication
   * @param {boolean} removeDuplicates - Whether to remove duplicates from database
   * @returns {Promise<Array>} Array of unique curators
   */
  async getAllCurators(removeDuplicates = true) {
    try {
      // Get all curators from database
      const allCurators = await this.db.curators.toArray();
      console.log(`CuratorRepository: Retrieved ${allCurators.length} total curators`);
      
      // Map to track unique curators by name (case-insensitive)
      const uniqueByName = new Map();
      const duplicates = [];
      
      // First pass - build map of unique curators
      allCurators.forEach(curator => {
        if (!curator.name) {
          console.warn(`CuratorRepository: Skipping curator with empty name, ID: ${curator.id}`);
          return;
        }
        
        const lowerName = curator.name.toLowerCase().trim();
        const existing = uniqueByName.get(lowerName);
        
        if (existing) {
          duplicates.push({ existing, duplicate: curator });
          
          // Keep the newer one, or local over remote, or with valid ID
          const existingDate = existing.lastActive ? new Date(existing.lastActive) : new Date(0);
          const curatorDate = curator.lastActive ? new Date(curator.lastActive) : new Date(0);
          
          if (
            (curator.serverId && !existing.serverId) ||
            (curator.origin === 'local' && existing.origin !== 'local') ||
            (curatorDate > existingDate)
          ) {
            uniqueByName.set(lowerName, curator);
          }
        } else {
          uniqueByName.set(lowerName, curator);
        }
      });
      
      // Remove duplicates if requested
      if (removeDuplicates && duplicates.length > 0) {
        await this._cleanupDuplicateCurators(duplicates);
      }
      
      // Convert map to array
      const uniqueCurators = Array.from(uniqueByName.values());
      return uniqueCurators;
    } catch (error) {
      console.error('CuratorRepository: Error getting all curators:', error);
      throw error;
    }
  }

  /**
   * Clean up duplicate curators in database
   * @param {Array} duplicates - Array of duplicate curator pairs
   * @returns {Promise<number>} Number of duplicates removed
   * @private
   */
  async _cleanupDuplicateCurators(duplicates) {
    if (!duplicates || duplicates.length === 0) return 0;
    
    try {
      let restaurantsUpdated = 0;
      let curatorsRemoved = 0;
      
      // Process each duplicate in a transaction
      await this.db.transaction('rw', 
        [this.db.curators, this.db.restaurants], 
        async () => {
          for (const {existing, duplicate} of duplicates) {
            if (existing.id === duplicate.id) continue;
            
            // Update any restaurants using the duplicate curator
            const restaurantsToUpdate = await this.db.restaurants
              .where('curatorId')
              .equals(duplicate.id)
              .toArray();
              
            if (restaurantsToUpdate.length > 0) {
              await Promise.all(restaurantsToUpdate.map(restaurant => 
                this.db.restaurants.update(restaurant.id, { curatorId: existing.id })
              ));
              restaurantsUpdated += restaurantsToUpdate.length;
            }
            
            // Delete the duplicate curator
            await this.db.curators.delete(duplicate.id);
            curatorsRemoved++;
          }
        }
      );
      
      console.log(`CuratorRepository: Removed ${curatorsRemoved} duplicate curators, updated ${restaurantsUpdated} restaurants`);
      return curatorsRemoved;
    } catch (error) {
      console.error('CuratorRepository: Error cleaning up duplicate curators:', error);
      return 0;
    }
  }
}

const curatorRepository = new CuratorRepository();
export default curatorRepository;
