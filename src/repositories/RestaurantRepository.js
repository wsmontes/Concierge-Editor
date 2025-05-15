/**
 * Repository for restaurant-related operations
 * Provides methods to create, retrieve, update, and delete restaurants
 * 
 * @module RestaurantRepository
 * @depends DatabaseService
 */

import databaseService from '../services/db/DatabaseService.js';

class RestaurantRepository {
  constructor() {
    this.db = null;
    this.isResetting = false;
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
      console.error('RestaurantRepository: Error initializing database:', error);
    }
  }

  /**
   * Get all restaurants with filtering options
   * @param {Object} options - Filter options
   * @param {number|null} options.curatorId - Filter by curator ID
   * @param {boolean} options.onlyCuratorRestaurants - Only show restaurants of specified curator
   * @param {boolean} options.includeRemote - Include remote restaurants
   * @param {boolean} options.includeLocal - Include local restaurants
   * @param {boolean} options.deduplicate - Deduplicate by name
   * @returns {Promise<Array>} Array of restaurant objects
   */
  async getRestaurants(options = {}) {
    try {
      // Ensure database is initialized
      if (!this.db) {
        await this._initializeDb();
      }
      
      const {
        curatorId = null,
        onlyCuratorRestaurants = true,
        includeRemote = true, 
        includeLocal = true,
        deduplicate = true
      } = options;
      
      console.log(`RestaurantRepository: Getting restaurants with options:`, {
        curatorId,
        onlyCuratorRestaurants,
        includeRemote,
        includeLocal,
        deduplicate
      });
      
      // Apply curator filtering if needed
      if (onlyCuratorRestaurants && curatorId) {
        console.log(`RestaurantRepository: Filtering by curator ID: ${curatorId}`);
        
        // Get all restaurants without filtering first
        const allRestaurants = await this.db.restaurants.toArray();
        
        // Convert curatorId to string for consistent comparison
        const curatorIdStr = String(curatorId);
        
        // Apply filtering
        const filteredRestaurants = allRestaurants.filter(restaurant => {
          // Handle source filtering
          if (restaurant.source === 'remote' && !includeRemote) return false;
          if (restaurant.source === 'local' && !includeLocal) return false;
          
          // Skip curator filtering if not required
          if (!onlyCuratorRestaurants) return true;
          
          // Convert restaurant curatorId to string for consistent comparison
          const restaurantCuratorIdStr = restaurant.curatorId !== undefined && 
                                        restaurant.curatorId !== null ? 
                                        String(restaurant.curatorId) : null;
          
          return restaurantCuratorIdStr === curatorIdStr;
        });
        
        console.log(`RestaurantRepository: After filtering: ${filteredRestaurants.length} restaurants match curator ${curatorIdStr}`);
        
        // Process filtered restaurants
        const restaurantIds = filteredRestaurants.map(r => r.id);
        return await this._processRestaurants(
          await this.db.restaurants.where('id').anyOf(restaurantIds).toArray(),
          deduplicate
        );
      } else {
        // No curator filtering
        console.log(`RestaurantRepository: Getting all restaurants (no curator filter)`);
        return await this._processRestaurants(
          await this.db.restaurants.toArray(), 
          deduplicate
        );
      }
    } catch (error) {
      console.error("RestaurantRepository: Error getting restaurants:", error);
      throw error;
    }
  }

  /**
   * Process restaurants by adding related data and optionally deduplicating
   * @param {Array} restaurants - Raw restaurant records
   * @param {boolean} deduplicate - Whether to deduplicate by name
   * @returns {Promise<Array>} Enhanced restaurant objects
   * @private
   */
  async _processRestaurants(restaurants, deduplicate = true) {
    console.log(`RestaurantRepository: Processing ${restaurants.length} raw restaurants`);
    
    // Load additional data
    const result = [];
    const processedNames = new Set();
    
    for (const restaurant of restaurants) {
      // Skip duplicates if deduplicate is enabled
      if (deduplicate && restaurant.name && processedNames.has(restaurant.name.toLowerCase())) {
        continue;
      }
      
      // Get curator name
      let curatorName = "Unknown";
      if (restaurant.curatorId) {
        const curator = await this.db.curators.get(restaurant.curatorId);
        if (curator) {
          curatorName = curator.name;
        }
      }
      
      // Get concepts
      const restaurantConcepts = await this.db.restaurantConcepts
        .where("restaurantId")
        .equals(restaurant.id)
        .toArray();
      
      const concepts = [];
      for (const rc of restaurantConcepts) {
        const concept = await this.db.concepts.get(rc.conceptId);
        if (concept) {
          concepts.push({
            category: concept.category,
            value: concept.value
          });
        }
      }
      
      // Get location
      const location = await this.db.restaurantLocations
        .where("restaurantId")
        .equals(restaurant.id)
        .first();
      
      // Get photo count
      const photoCount = await this.db.restaurantPhotos
        .where("restaurantId")
        .equals(restaurant.id)
        .count();
      
      // Add to result
      result.push({
        ...restaurant,
        curatorName,
        concepts,
        location,
        photoCount
      });
      
      if (deduplicate && restaurant.name) {
        processedNames.add(restaurant.name.toLowerCase());
      }
    }
    
    console.log(`RestaurantRepository: After processing: ${result.length} restaurants`);
    return result;
  }

  /**
   * Get a restaurant by ID with all related data
   * @param {number} restaurantId - Restaurant ID
   * @returns {Promise<Object|null>} Full restaurant details or null if not found
   */
  async getRestaurantById(restaurantId) {
    try {
      const restaurant = await this.db.restaurants.get(restaurantId);
      if (!restaurant) return null;
      
      // Get concept IDs for this restaurant
      const restaurantConcepts = await this.db.restaurantConcepts
        .where('restaurantId')
        .equals(restaurantId)
        .toArray();
        
      // Get full concept data
      const conceptIds = restaurantConcepts.map(rc => rc.conceptId);
      restaurant.concepts = await this.db.concepts
        .where('id')
        .anyOf(conceptIds)
        .toArray();
        
      // Get location data
      const locations = await this.db.restaurantLocations
        .where('restaurantId')
        .equals(restaurantId)
        .toArray();
      restaurant.location = locations.length > 0 ? locations[0] : null;
      
      // Get photos
      restaurant.photos = await this.db.restaurantPhotos
        .where('restaurantId')
        .equals(restaurantId)
        .toArray();
        
      // Get curator
      if (restaurant.curatorId) {
        restaurant.curator = await this.db.curators.get(restaurant.curatorId);
      }
        
      return restaurant;
    } catch (error) {
      console.error(`RestaurantRepository: Error getting restaurant details for ID ${restaurantId}:`, error);
      return null;
    }
  }

  /**
   * Save a restaurant with source tracking
   * @param {string} name - Restaurant name
   * @param {number|null} curatorId - Curator ID
   * @param {Array} concepts - Array of concept objects
   * @param {Object|null} location - Location data
   * @param {Array} photos - Array of photo data
   * @param {string} transcription - Transcription text
   * @param {string} description - Restaurant description
   * @param {string} source - Data source ('local' or 'remote')
   * @param {string|number|null} serverId - Server ID if source is remote
   * @returns {Promise<number>} Restaurant ID
   */
  async saveRestaurant(
    name, 
    curatorId = null, 
    concepts = [], 
    location = null, 
    photos = [], 
    transcription = '', 
    description = '',
    source = 'local',
    serverId = null
  ) {
    console.log(`RestaurantRepository: Saving restaurant: ${name} with curator ID: ${curatorId}, source: ${source}`);
    
    try {
      // Pre-save concepts to avoid transaction issues
      const conceptIds = [];
      for (const concept of concepts) {
        if (concept.category && concept.value) {
          try {
            const conceptId = await this._saveConcept(concept.category, concept.value);
            conceptIds.push({
              conceptId: conceptId,
              category: concept.category,
              value: concept.value
            });
          } catch (conceptError) {
            console.warn(`RestaurantRepository: Error pre-saving concept ${concept.category}:${concept.value}:`, conceptError);
          }
        }
      }

      // Now proceed with the main transaction
      return await this._saveRestaurantWithTransaction(
        name, curatorId, conceptIds, location, photos, 
        transcription, description, source, serverId
      );
    } catch (error) {
      console.error('RestaurantRepository: Error in pre-save phase:', error);
      
      if (error.name === 'NotFoundError' || 
          error.message.includes('object store was not found') ||
          error.name === 'PrematureCommitError') {
        console.warn('RestaurantRepository: Database error, attempting reset...');
        await databaseService.resetDatabase();
        // Try one more time after reset
        return this.saveRestaurant(name, curatorId, concepts, location, photos, transcription, description, source, serverId);
      }
      
      throw error;
    }
  }

  /**
   * Internal method to save a restaurant with transaction
   * @param {string} name - Restaurant name
   * @param {number|null} curatorId - Curator ID
   * @param {Array} conceptsOrIds - Array of concepts or pre-saved concept IDs
   * @param {Object|null} location - Location data
   * @param {Array} photos - Array of photo data
   * @param {string} transcription - Transcription text
   * @param {string} description - Restaurant description
   * @param {string} source - Data source ('local' or 'remote')
   * @param {string|number|null} serverId - Server ID if source is remote
   * @returns {Promise<number>} Restaurant ID
   * @private
   */
  async _saveRestaurantWithTransaction(
    name, curatorId, conceptsOrIds, location, photos, 
    transcription, description, source = 'local', serverId = null
  ) {
    // Determine if we're working with pre-saved concept IDs or raw concepts
    const areConceptIds = conceptsOrIds.length > 0 && conceptsOrIds[0].conceptId !== undefined;
    
    try {
      return await this.db.transaction('rw', 
        [this.db.restaurants, this.db.restaurantConcepts, 
        this.db.restaurantLocations, this.db.restaurantPhotos], 
      async () => {
        // Save restaurant with source tracking
        const restaurantId = await this.db.restaurants.add({
          name,
          curatorId,
          timestamp: new Date(),
          transcription,
          description,
          source: source,
          serverId: serverId
        });
        
        console.log(`RestaurantRepository: Restaurant saved with ID: ${restaurantId}, source: ${source}`);
        
        // Save concept relationships
        if (conceptsOrIds && conceptsOrIds.length > 0) {
          for (const item of conceptsOrIds) {
            if (areConceptIds) {
              // Using pre-saved concept IDs
              await this.db.restaurantConcepts.add({
                restaurantId,
                conceptId: item.conceptId
              });
            } else {
              // Using raw concepts
              const conceptId = await this._saveConcept(item.category, item.value);
              await this.db.restaurantConcepts.add({
                restaurantId,
                conceptId
              });
            }
          }
        }
        
        // Save location if provided
        if (location && location.latitude !== undefined && location.longitude !== undefined) {
          await this.db.restaurantLocations.add({
            restaurantId,
            latitude: location.latitude,
            longitude: location.longitude,
            address: location.address || null
          });
        }
        
        // Save photos if provided
        if (photos && photos.length > 0) {
          for (const photoData of photos) {
            await this.db.restaurantPhotos.add({
              restaurantId,
              photoData
            });
          }
        }
        
        return restaurantId;
      });
    } catch (error) {
      console.error('RestaurantRepository: Error in saveRestaurant transaction:', error);
      
      // Handle transaction failures
      if (!this.isResetting && (
        error.name === 'NotFoundError' || 
        error.message.includes('object store was not found') ||
        error.name === 'PrematureCommitError')) {
        await databaseService.resetDatabase();
        throw new Error('Database reset, please retry your operation');
      }
      
      throw error;
    }
  }

  /**
   * Update an existing restaurant
   * @param {number} restaurantId - Restaurant ID
   * @param {string} name - Restaurant name
   * @param {number} curatorId - Curator ID
   * @param {Array} concepts - Array of concept objects
   * @param {Object|null} location - Location data
   * @param {Array} photos - Array of photo data
   * @param {string} transcription - Transcription text
   * @param {string} description - Restaurant description
   * @returns {Promise<number>} Restaurant ID
   */
  async updateRestaurant(restaurantId, name, curatorId, concepts, location, photos, transcription, description) {
    console.log(`RestaurantRepository: Updating restaurant: ${name} with ID: ${restaurantId}`);
    
    try {
      // Get the existing restaurant to preserve source information
      const existingRestaurant = await this.db.restaurants.get(restaurantId);
      if (!existingRestaurant) {
        throw new Error(`Restaurant with ID ${restaurantId} not found`);
      }
      
      // Always mark as 'local' when updating, even if it was originally remote
      const source = 'local';
      
      // Preserve server ID if it exists
      const serverId = existingRestaurant.serverId || null;
      
      // Pre-save all concepts
      const conceptIds = [];
      for (const concept of concepts) {
        if (concept.category && concept.value) {
          try {
            const conceptId = await this._saveConcept(concept.category, concept.value);
            conceptIds.push({
              conceptId: conceptId,
              category: concept.category,
              value: concept.value
            });
          } catch (conceptError) {
            console.warn(`RestaurantRepository: Error pre-saving concept ${concept.category}:${concept.value}:`, conceptError);
          }
        }
      }
      
      // Transaction for update
      return await this.db.transaction('rw', 
        [this.db.restaurants, this.db.restaurantConcepts, 
         this.db.restaurantLocations, this.db.restaurantPhotos], 
      async () => {
        // Update restaurant with source tracking
        await this.db.restaurants.update(restaurantId, {
          name,
          curatorId,
          timestamp: new Date(),
          transcription,
          description,
          source,      // Always mark as 'local' when updated
          serverId     // Preserve server ID if it exists
        });
        
        // Remove existing concept relationships
        await this.db.restaurantConcepts.where('restaurantId').equals(restaurantId).delete();
        
        // Add new concept relationships
        for (const item of conceptIds) {
          await this.db.restaurantConcepts.add({
            restaurantId,
            conceptId: item.conceptId
          });
        }
        
        // Update location
        await this.db.restaurantLocations.where('restaurantId').equals(restaurantId).delete();
        if (location && location.latitude !== undefined && location.longitude !== undefined) {
          await this.db.restaurantLocations.add({
            restaurantId,
            latitude: location.latitude,
            longitude: location.longitude,
            address: location.address || null
          });
        }
        
        // Update photos
        await this.db.restaurantPhotos.where('restaurantId').equals(restaurantId).delete();
        if (photos && photos.length > 0) {
          for (const photoData of photos) {
            await this.db.restaurantPhotos.add({
              restaurantId,
              photoData
            });
          }
        }
        
        console.log(`RestaurantRepository: Restaurant updated successfully. ID: ${restaurantId}`);
        return restaurantId;
      });
    } catch (error) {
      console.error('RestaurantRepository: Error updating restaurant:', error);
      
      if (!this.isResetting && (
        error.name === 'NotFoundError' || 
        error.message.includes('object store was not found') ||
        error.name === 'PrematureCommitError')) {
        await databaseService.resetDatabase();
        return this.updateRestaurant(restaurantId, name, curatorId, concepts, location, photos, transcription, description);
      }
      
      throw error;
    }
  }

  /**
   * Delete a restaurant and all related data
   * @param {number} restaurantId - Restaurant ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteRestaurant(restaurantId) {
    try {
      // Transaction to ensure all related data is deleted
      await this.db.transaction('rw', 
        [this.db.restaurants, this.db.restaurantConcepts, 
         this.db.restaurantLocations, this.db.restaurantPhotos], 
      async () => {
        // Delete all related data
        await this.db.restaurantConcepts.where('restaurantId').equals(restaurantId).delete();
        await this.db.restaurantLocations.where('restaurantId').equals(restaurantId).delete();
        await this.db.restaurantPhotos.where('restaurantId').equals(restaurantId).delete();
        
        // Delete the restaurant itself
        await this.db.restaurants.delete(restaurantId);
      });
      
      console.log(`RestaurantRepository: Restaurant ${restaurantId} deleted successfully`);
      return true;
    } catch (error) {
      console.error(`RestaurantRepository: Error deleting restaurant ${restaurantId}:`, error);
      throw error;
    }
  }

  /**
   * Get restaurants that need to be synced with server (local ones only)
   * @returns {Promise<Array>} Array of unsynced restaurant objects
   */
  async getUnsyncedRestaurants() {
    try {
      // Use the indexed 'source' field
      const unsyncedRestaurants = await this.db.restaurants
        .where('source')
        .equals('local')
        .filter(restaurant => !restaurant.serverId)
        .toArray();
          
      console.log(`RestaurantRepository: Found ${unsyncedRestaurants.length} unsynced restaurants`);
      
      // Return restaurants with enhanced data
      const enhancedRestaurants = [];
      for (const restaurant of unsyncedRestaurants) {
        // Get concepts
        const restaurantConcepts = await this.db.restaurantConcepts
          .where('restaurantId')
          .equals(restaurant.id)
          .toArray();
          
        const conceptIds = restaurantConcepts.map(rc => rc.conceptId);
        restaurant.concepts = await this.db.concepts
          .where('id')
          .anyOf(conceptIds)
          .toArray();
          
        // Get location
        const locations = await this.db.restaurantLocations
          .where('restaurantId')
          .equals(restaurant.id)
          .toArray();
        restaurant.location = locations.length > 0 ? locations[0] : null;
        
        // Get curator
        if (restaurant.curatorId) {
          restaurant.curator = await this.db.curators.get(restaurant.curatorId);
        }
        
        enhancedRestaurants.push(restaurant);
      }
      
      return enhancedRestaurants;
    } catch (error) {
      console.error('RestaurantRepository: Error getting unsynced restaurants:', error);
      throw error;
    }
  }

  /**
   * Update a restaurant's sync status after successful server sync
   * @param {number} restaurantId - Local restaurant ID
   * @param {number} serverId - Server restaurant ID
   * @returns {Promise<void>}
   */
  async updateRestaurantSyncStatus(restaurantId, serverId) {
    try {
      await this.db.restaurants.update(restaurantId, {
        source: 'remote', // Mark as remote since it's now synced with server
        serverId: serverId
      });
      
      console.log(`RestaurantRepository: Restaurant ${restaurantId} marked as synced with server ID ${serverId}`);
    } catch (error) {
      console.error(`RestaurantRepository: Error updating sync status for restaurant ${restaurantId}:`, error);
      throw error;
    }
  }

  /**
   * Save a concept to the database
   * @param {string} category - Concept category
   * @param {string} value - Concept value
   * @param {boolean} isRetry - Whether this is a retry attempt
   * @returns {Promise<number>} Concept ID
   * @private
   */
  async _saveConcept(category, value, isRetry = false) {
    try {
      // Check for existing concept
      let existingConcept = null;
      try {
        existingConcept = await this.db.concepts
          .where('[category+value]')
          .equals([category, value])
          .first();
      } catch (error) {
        if (isRetry) throw error;
        
        // Try to reset and retry
        await databaseService.resetDatabase();
        return this._saveConcept(category, value, true);
      }
          
      if (existingConcept) {
        return existingConcept.id;
      }
      
      // Add new concept
      try {
        return await this.db.concepts.put({
          category,
          value,
          timestamp: new Date()
        });
      } catch (error) {
        if (isRetry) throw error;
        
        await databaseService.resetDatabase();
        return this._saveConcept(category, value, true);
      }
    } catch (error) {
      console.error(`RestaurantRepository: Error saving concept ${category}:${value}:`, error);
      throw error;
    }
  }

  /**
   * Get all unique concept categories
   * @returns {Promise<Array<string>>} Array of unique categories
   */
  async getAllConceptCategories() {
    try {
      const concepts = await this.db.concepts.toArray();
      const categories = new Set();
      
      concepts.forEach(concept => {
        if (concept.category) {
          categories.add(concept.category);
        }
      });
      
      return Array.from(categories).sort();
    } catch (error) {
      console.error('RestaurantRepository: Error getting concept categories:', error);
      return [];
    }
  }

  /**
   * Get concept values for a specific category
   * @param {string} category - Concept category
   * @returns {Promise<Array<string>>} Array of values for the category
   */
  async getConceptValuesByCategory(category) {
    try {
      const concepts = await this.db.concepts.where('category').equals(category).toArray();
      return concepts.map(concept => concept.value).sort();
    } catch (error) {
      console.error(`RestaurantRepository: Error getting concept values for category ${category}:`, error);
      return [];
    }
  }
}

const restaurantRepository = new RestaurantRepository();
export default restaurantRepository;
