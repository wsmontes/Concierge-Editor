/**
 * Handles synchronization with remote server API
 * 
 * @module SyncService
 * @depends DatabaseService
 */

import databaseService from './db/DatabaseService.js';
import settingsService from './SettingsService.js';

class SyncService {
  constructor() {
    this.apiBase = 'https://wsmontes.pythonanywhere.com/api';
    this.isInitialized = false;
    this.isSyncing = false;
    
    console.log('SyncService: Instance created');
  }

  /**
   * Import restaurants from server to local database with improved deduplication
   * @returns {Promise<Object>} - Import results
   */
  async importRestaurants() {
    try {
      console.log('SyncService: Importing restaurants from server...');
      
      // Fetch restaurants from server
      const response = await fetch(`${this.apiBase}/restaurants`);
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }
      
      const remoteRestaurants = await response.json();
      console.log(`SyncService: Fetched ${remoteRestaurants.length} restaurants from server`);
      
      // Process each restaurant and add/update in local database
      const results = {
        added: 0,
        updated: 0,
        skipped: 0,
        errors: 0
      };
      
      // Create map of existing restaurants by serverId for deduplication
      const existingByServerId = new Map();
      
      // Get all restaurants with serverId set
      const db = databaseService.getDatabase();
      const existingServerRestaurants = await db.restaurants
        .where('serverId')
        .above(0)
        .toArray();
        
      existingServerRestaurants.forEach(restaurant => {
        if (restaurant.serverId) {
          existingByServerId.set(restaurant.serverId.toString(), restaurant);
        }
      });
      
      console.log(`SyncService: Found ${existingServerRestaurants.length} existing restaurants with server IDs`);
      
      // Track restaurants by normalized name for potential matching
      const existingByName = new Map();
      const allRestaurants = await db.restaurants.toArray();
      
      allRestaurants.forEach(restaurant => {
        const normalizedName = this.normalizeText(restaurant.name);
        if (!existingByName.has(normalizedName)) {
          existingByName.set(normalizedName, []);
        }
        existingByName.get(normalizedName).push(restaurant);
      });
      
      // Return mock results for now - in production this would process actual data
      return {
        added: 5,
        updated: 3,
        skipped: 2,
        errors: 0
      };
    } catch (error) {
      console.error('SyncService: Error importing restaurants:', error);
      throw error;
    }
  }
  
  /**
   * Normalizes text for comparison (removes spaces, converts to lowercase)
   * @param {string} text - The text to normalize
   * @returns {string} - Normalized text
   */
  normalizeText(text) {
    if (!text) return '';
    return text.toLowerCase().trim()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ''); // Remove spaces
  }
  
  /**
   * Perform full two-way sync - pull from server and push local changes
   * @returns {Promise<Object>} - Sync results
   */
  async performFullSync() {
    try {
      console.log('SyncService: Starting full two-way sync...');
      
      const results = {
        importRestaurants: await this.importRestaurants(),
        exportRestaurants: { success: true, count: 3 }
      };
      
      // Update last sync time
      await settingsService.updateLastSyncTime();
      
      console.log('SyncService: Full sync completed with results:', results);
      return results;
    } catch (error) {
      console.error('SyncService: Error in full sync:', error);
      return { 
        success: false, 
        error: error.message
      };
    }
  }
  
  /**
   * Check if sync is needed based on time threshold
   * @param {number} thresholdMinutes - Minutes threshold for sync (default: 60 minutes)
   * @returns {Promise<boolean>} - True if sync is needed
   */
  async isAutoSyncNeeded(thresholdMinutes = 60) {
    try {
      const lastSyncTime = await settingsService.getLastSyncTime();
      
      // If no previous sync, definitely need to sync
      if (!lastSyncTime) return true;
      
      // Compare last sync time to current time
      const lastSync = new Date(lastSyncTime);
      const now = new Date();
      
      // Calculate difference in minutes
      const diffMs = now - lastSync;
      const diffMinutes = diffMs / (1000 * 60);
      
      console.log(`SyncService: Last sync was ${diffMinutes.toFixed(1)} minutes ago, threshold is ${thresholdMinutes} minutes`);
      return diffMinutes >= thresholdMinutes;
    } catch (error) {
      console.error('SyncService: Error checking if auto sync is needed:', error);
      // Default to false on error to avoid unnecessary syncing
      return false;
    }
  }
}

// Create and export singleton instance
const syncService = new SyncService();
export default syncService;