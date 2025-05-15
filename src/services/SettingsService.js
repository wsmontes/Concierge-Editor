/**
 * Manages application settings including sync configuration
 * Provides methods to get and update settings
 * 
 * @module SettingsService
 * @depends DatabaseService
 */

import databaseService from './db/DatabaseService.js';

class SettingsService {
  constructor() {
    this.db = null;
    this.defaultSettings = {
      syncIntervalMinutes: 30,
      syncOnStartup: true,
      syncHistory: [],
      currentCurator: null,
      lastSyncTime: null
    };
    
    // Initialize the database reference when needed, not immediately
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
      console.error('SettingsService: Error initializing database:', error);
    }
  }

  /**
   * Get a setting value with default fallback
   * @param {string} key - Setting key
   * @param {any} defaultValue - Default value if not found
   * @returns {Promise<any>} The setting value
   */
  async getSetting(key, defaultValue = null) {
    try {
      if (!this.db) {
        await this._initializeDb();
      }
      
      // Use the default from defaultSettings if available, otherwise use the provided default
      const effectiveDefault = key in this.defaultSettings ? this.defaultSettings[key] : defaultValue;
      
      const setting = await this.db.settings.get(key);
      return setting ? setting.value : effectiveDefault;
    } catch (error) {
      console.error(`SettingsService: Error getting setting ${key}:`, error);
      return key in this.defaultSettings ? this.defaultSettings[key] : defaultValue;
    }
  }

  /**
   * Update or create a setting
   * @param {string} key - Setting key
   * @param {any} value - Setting value
   * @returns {Promise<number>} Setting ID
   */
  async updateSetting(key, value) {
    try {
      if (!this.db) {
        await this._initializeDb();
      }
      return await this.db.settings.put({ key, value });
    } catch (error) {
      console.error(`SettingsService: Error updating setting ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get the last sync time
   * @returns {Promise<Date|null>} Last sync time or null
   */
  async getLastSyncTime() {
    try {
      const lastSyncTimeStr = await this.getSetting('lastSyncTime', null);
      return lastSyncTimeStr ? new Date(lastSyncTimeStr) : null;
    } catch (error) {
      console.error('SettingsService: Error getting last sync time:', error);
      return null;
    }
  }

  /**
   * Update last sync time to current time
   * @returns {Promise<void>}
   */
  async updateLastSyncTime() {
    try {
      await this.updateSetting('lastSyncTime', new Date().toISOString());
      console.log('SettingsService: Last sync time updated:', new Date().toISOString());
    } catch (error) {
      console.error('SettingsService: Error updating last sync time:', error);
      throw error;
    }
  }

  /**
   * Get sync history
   * @returns {Promise<Array>} Sync history entries
   */
  async getSyncHistory() {
    return await this.getSetting('syncHistory', []);
  }

  /**
   * Add entry to sync history
   * @param {Object} result - Sync result
   * @param {string} status - Success or error
   * @returns {Promise<void>}
   */
  async addSyncHistoryEntry(result, status = 'success') {
    try {
      const history = await this.getSyncHistory();
      
      const entry = {
        timestamp: new Date().toISOString(),
        status: status,
        message: status === 'success' 
          ? `Imported ${result.added || 0} new, updated ${result.updated || 0}` 
          : result.error || 'Sync failed'
      };
      
      // Add new entry and keep only last 10
      const updatedHistory = [entry, ...history].slice(0, 10);
      await this.updateSetting('syncHistory', updatedHistory);
      
      // Update last sync time if successful
      if (status === 'success') {
        await this.updateLastSyncTime();
      }
    } catch (error) {
      console.error('SettingsService: Error updating sync history:', error);
    }
  }

  /**
   * Get sync settings
   * @returns {Promise<Object>} Sync settings
   */
  async getSyncSettings() {
    return {
      syncIntervalMinutes: await this.getSetting('syncIntervalMinutes', 30),
      syncOnStartup: await this.getSetting('syncOnStartup', true)
    };
  }

  /**
   * Update sync settings
   * @param {Object} settings - Sync settings
   * @returns {Promise<void>}
   */
  async updateSyncSettings(settings) {
    const interval = Math.max(settings.syncIntervalMinutes || 30, 5); // Minimum 5 minutes
    await this.updateSetting('syncIntervalMinutes', interval);
    await this.updateSetting('syncOnStartup', settings.syncOnStartup);
  }

  /**
   * Check if sync is needed based on time threshold
   * @param {number} thresholdMinutes - Minutes threshold for sync
   * @returns {Promise<boolean>} Whether sync is needed
   */
  async isAutoSyncNeeded(thresholdMinutes = null) {
    try {
      // If no threshold provided, get from settings
      if (thresholdMinutes === null) {
        thresholdMinutes = await this.getSetting('syncIntervalMinutes', 60);
      }
      
      const lastSyncTime = await this.getLastSyncTime();
      
      // If no previous sync, definitely need to sync
      if (!lastSyncTime) return true;
      
      // Compare last sync time to current time
      const lastSync = new Date(lastSyncTime);
      const now = new Date();
      
      // Calculate difference in minutes
      const diffMs = now - lastSync;
      const diffMinutes = diffMs / (1000 * 60);
      
      console.log(`SettingsService: Last sync was ${diffMinutes.toFixed(1)} minutes ago, threshold is ${thresholdMinutes} minutes`);
      return diffMinutes >= thresholdMinutes;
    } catch (error) {
      console.error('SettingsService: Error checking if auto sync is needed:', error);
      return false; // Default to false on error
    }
  }
}

const settingsService = new SettingsService();
export default settingsService;
