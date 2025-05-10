/**
 * restaurant-model.js
 * 
 * Purpose: Defines the restaurant entity model for the Concierge Editor application.
 * Provides schema and operations for restaurant data.
 * 
 * Dependencies: 
 *   - indexedDB-database.js - Uses IndexedDBManager for database operations
 *   - concierge-data.js - Registers with ConciergeData
 */

const RestaurantModel = (() => {
  // Store names for restaurant entity
  const STORES = {
    CURATORS: 'curators',
    CONCEPTS: 'concepts',
    RESTAURANTS: 'restaurants',
    RESTAURANT_CONCEPTS: 'restaurantConcepts',
    RESTAURANT_LOCATIONS: 'restaurantLocations',
    RESTAURANT_PHOTOS: 'restaurantPhotos'
  };
  
  // Database reference (set during initialization)
  let db = null;

  // Restaurant schema definition
  const schema = {
    stores: {
      [STORES.CURATORS]: {
        keyPath: 'id',
        autoIncrement: true,
        indices: [
          { name: 'by_name', keyPath: 'name' },
          { name: 'by_lastActive', keyPath: 'lastActive' }
        ]
      },
      [STORES.CONCEPTS]: {
        keyPath: 'id',
        autoIncrement: true,
        indices: [
          { name: 'by_category', keyPath: 'category' },
          { name: 'by_value', keyPath: 'value' },
          { name: 'by_category_value', keyPath: ['category', 'value'] },
          { name: 'by_timestamp', keyPath: 'timestamp' }
        ]
      },
      [STORES.RESTAURANTS]: {
        keyPath: 'id',
        autoIncrement: true,
        indices: [
          { name: 'by_name', keyPath: 'name' },
          { name: 'by_curatorId', keyPath: 'curatorId' },
          { name: 'by_timestamp', keyPath: 'timestamp' }
        ]
      },
      [STORES.RESTAURANT_CONCEPTS]: {
        keyPath: 'id',
        autoIncrement: true,
        indices: [
          { name: 'by_restaurantId', keyPath: 'restaurantId' },
          { name: 'by_conceptId', keyPath: 'conceptId' },
          { name: 'by_restaurant_concept', keyPath: ['restaurantId', 'conceptId'] }
        ]
      },
      [STORES.RESTAURANT_LOCATIONS]: {
        keyPath: 'id',
        autoIncrement: true,
        indices: [
          { name: 'by_restaurantId', keyPath: 'restaurantId' },
          { name: 'by_coordinates', keyPath: ['latitude', 'longitude'] }
        ]
      },
      [STORES.RESTAURANT_PHOTOS]: {
        keyPath: 'id',
        autoIncrement: true,
        indices: [
          { name: 'by_restaurantId', keyPath: 'restaurantId' },
          { name: 'by_photoDataRef', keyPath: 'photoDataRef' }
        ]
      }
    }
  };

  /**
   * Initializes the restaurant model with database instance
   * @param {IndexedDBManager} database - Database instance
   */
  const initialize = (database) => {
    db = database;
    return Promise.resolve();
  };

  /**
   * Handles data import event
   * @param {Object} data - Imported data
   */
  const onDataImported = (data) => {
    console.log('Restaurant model received data import notification');
  };

  // Curator operations
  const curatorOperations = {
    getAll: async () => {
      return await db.getAll(STORES.CURATORS);
    },
    
    getById: async (id) => {
      return await db.getById(STORES.CURATORS, id);
    },
    
    add: async (curator) => {
      if (!curator.name) throw new Error('Curator name is required');
      
      const newCurator = {
        ...curator,
        lastActive: curator.lastActive || new Date().toISOString()
      };
      
      return await db.add(STORES.CURATORS, newCurator);
    },
    
    update: async (curator) => {
      await db.update(STORES.CURATORS, curator);
    },
    
    delete: async (id) => {
      await db.delete(STORES.CURATORS, id);
    }
  };

  // Restaurant operations
  const restaurantOperations = {
    getAll: async () => {
      return await db.getAll(STORES.RESTAURANTS);
    },
    
    getById: async (id) => {
      return await db.getById(STORES.RESTAURANTS, id);
    },
    
    getByCuratorId: async (curatorId) => {
      return await db.queryByIndex(STORES.RESTAURANTS, 'by_curatorId', curatorId);
    },
    
    getFullDetails: async (restaurantId) => {
      const restaurant = await db.getById(STORES.RESTAURANTS, restaurantId);
      if (!restaurant) return null;
      
      const [concepts, locations, photos] = await Promise.all([
        db.queryByIndex(STORES.RESTAURANT_CONCEPTS, 'by_restaurantId', restaurantId),
        db.queryByIndex(STORES.RESTAURANT_LOCATIONS, 'by_restaurantId', restaurantId),
        db.queryByIndex(STORES.RESTAURANT_PHOTOS, 'by_restaurantId', restaurantId)
      ]);
      
      return {
        ...restaurant,
        concepts,
        locations,
        photos
      };
    },
    
    add: async (restaurant) => {
      if (!restaurant.name) throw new Error('Restaurant name is required');
      if (!restaurant.curatorId) throw new Error('CuratorId is required');
      
      const newRestaurant = {
        ...restaurant,
        timestamp: restaurant.timestamp || new Date().toISOString()
      };
      
      return await db.add(STORES.RESTAURANTS, newRestaurant);
    },
    
    update: async (restaurant) => {
      await db.update(STORES.RESTAURANTS, restaurant);
    },
    
    delete: async (id) => {
      // First delete associated data in other stores
      const [concepts, locations, photos] = await Promise.all([
        db.queryByIndex(STORES.RESTAURANT_CONCEPTS, 'by_restaurantId', id),
        db.queryByIndex(STORES.RESTAURANT_LOCATIONS, 'by_restaurantId', id),
        db.queryByIndex(STORES.RESTAURANT_PHOTOS, 'by_restaurantId', id)
      ]);
      
      // Delete associated data
      await Promise.all([
        ...concepts.map(c => db.delete(STORES.RESTAURANT_CONCEPTS, c.id)),
        ...locations.map(l => db.delete(STORES.RESTAURANT_LOCATIONS, l.id)),
        ...photos.map(p => db.delete(STORES.RESTAURANT_PHOTOS, p.id))
      ]);
      
      // Delete the restaurant
      await db.delete(STORES.RESTAURANTS, id);
    }
  };

  // Concept operations
  const conceptOperations = {
    getAll: async () => {
      return await db.getAll(STORES.CONCEPTS);
    },
    
    getById: async (id) => {
      try {
        return await db.getById(STORES.CONCEPTS, id);
      } catch (error) {
        console.error(`Error in concepts.getById for ID ${id}:`, error);
        throw error;
      }
    },
    
    getByCategory: async (category) => {
      return await db.queryByIndex(STORES.CONCEPTS, 'by_category', category);
    },
    
    getCategories: async () => {
      const concepts = await db.getAll(STORES.CONCEPTS);
      return [...new Set(concepts.map(c => c.category))];
    },
    
    add: async (concept) => {
      if (!concept.category || !concept.value) {
        throw new Error('Concept category and value are required');
      }
      
      const newConcept = {
        ...concept,
        timestamp: concept.timestamp || new Date().toISOString()
      };
      
      return await db.add(STORES.CONCEPTS, newConcept);
    }
  };

  // Restaurant Concepts operations
  const restaurantConceptsOperations = {
    getAll: async () => {
      return await db.getAll(STORES.RESTAURANT_CONCEPTS);
    },
    
    getById: async (id) => {
      return await db.getById(STORES.RESTAURANT_CONCEPTS, id);
    },
    
    getByRestaurantId: async (restaurantId) => {
      const allConcepts = await db.getAll(STORES.RESTAURANT_CONCEPTS);
      return allConcepts.filter(concept => concept.restaurantId === restaurantId);
    },
    
    add: async (conceptRelationData) => {
      return await db.add(STORES.RESTAURANT_CONCEPTS, conceptRelationData);
    },
    
    update: async (id, conceptRelationData) => {
      return await db.update(STORES.RESTAURANT_CONCEPTS, id, conceptRelationData);
    },
    
    delete: async (id) => {
      return await db.delete(STORES.RESTAURANT_CONCEPTS, id);
    }
  };

  // Restaurant Photos operations
  const restaurantPhotosOperations = {
    getAll: async () => {
      return await db.getAll(STORES.RESTAURANT_PHOTOS);
    },
    
    getById: async (id) => {
      return await db.getById(STORES.RESTAURANT_PHOTOS, id);
    },
    
    getByRestaurantId: async (restaurantId) => {
      return await db.queryByIndex(STORES.RESTAURANT_PHOTOS, 'by_restaurantId', restaurantId);
    },
    
    add: async (photoData) => {
      if (!photoData.restaurantId) throw new Error('RestaurantId is required');
      if (!photoData.photoDataRef) throw new Error('PhotoDataRef is required');
      
      const newPhoto = {
        ...photoData,
        timestamp: photoData.timestamp || new Date().toISOString()
      };
      
      return await db.add(STORES.RESTAURANT_PHOTOS, newPhoto);
    },
    
    update: async (id, photoData) => {
      return await db.update(STORES.RESTAURANT_PHOTOS, id, photoData);
    },
    
    delete: async (id) => {
      return await db.delete(STORES.RESTAURANT_PHOTOS, id);
    }
  };

  // Model definition
  const model = {
    schema,
    initialize,
    onDataImported,
    STORES,
    curators: curatorOperations,
    restaurants: restaurantOperations,
    concepts: conceptOperations,
    restaurantConcepts: restaurantConceptsOperations,
    restaurantPhotos: restaurantPhotosOperations  // Add this line to expose the operations
  };

  // Register this model with ConciergeData
  if (window.ConciergeData) {
    window.ConciergeData.registerModel('restaurant', model);
  } else {
    console.error('ConciergeData not found. Make sure concierge-data.js is loaded first.');
  }

  return model;
})();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RestaurantModel;
} else {
  window.RestaurantModel = RestaurantModel;
}
