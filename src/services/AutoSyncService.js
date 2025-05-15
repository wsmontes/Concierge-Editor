/**
 * Handles automatic synchronization of data based on schedule
 * Manages sync intervals and performs periodic sync operations
 * 
 * @module AutoSyncService
 * @depends SyncService, SettingsService
 */

import syncService from './SyncService.js';
import settingsService from './SettingsService.js';

class AutoSyncService {
  constructor() {
    this.syncIntervalId = null;
    this.isInitialized = false;
    this.isPerformingSync = false;
    this.defaultSyncInterval = 30; // minutes
    
    console.log('AutoSyncService: Created instance');
  }

  /**
   * Initialize the auto-sync service
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('AutoSyncService: Already initialized');
      return;
    }
    
    try {
      console.log('AutoSyncService: Initializing...');
      const syncSettings = await settingsService.getSyncSettings();
      
      // Setup interval with settings
      await this.setupSyncInterval(syncSettings.syncIntervalMinutes);
      
      // Check if we should sync on startup
      if (syncSettings.syncOnStartup) {
        console.log('AutoSyncService: Sync on startup enabled, scheduling initial sync...');
        
        // Delay initial sync a bit to allow app to load
        setTimeout(() => this.checkAndPerformSync(), 5000);
      }
      
      this.isInitialized = true;
      console.log('AutoSyncService: Initialization complete');
    } catch (error) {
      console.error('AutoSyncService: Error during initialization:', error);
      // Still mark as initialized to prevent retry loops
      this.isInitialized = true;
    }
  }

  /**
   * Setup the sync interval
   * @param {number} intervalMinutes Minutes between sync attempts
   * @returns {Promise<void>}
   */
  async setupSyncInterval(intervalMinutes = null) {
    // Clear any existing interval
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }
    
    // Use provided interval or get from settings
    const minutes = intervalMinutes || 
      (await settingsService.getSetting('syncIntervalMinutes', this.defaultSyncInterval));
    
    // Ensure minimum interval (5 minutes)
    const safeInterval = Math.max(5, minutes);
    
    // Convert to milliseconds
    const intervalMs = safeInterval * 60 * 1000;
    
    console.log(`AutoSyncService: Setting up sync interval for every ${safeInterval} minutes`);
    
    // Set new interval
    this.syncIntervalId = setInterval(() => this.checkAndPerformSync(), intervalMs);
    
    return safeInterval;
  }

  /**
   * Check if sync is needed and perform it
   * @returns {Promise<boolean>} Whether sync was performed
   */
  async checkAndPerformSync() {
    // Prevent concurrent syncs
    if (this.isPerformingSync) {
      console.log('AutoSyncService: Sync already in progress, skipping check');
      return false;
    }
    
    try {
      this.isPerformingSync = true;
      
      // Check if enough time has passed since last sync
      const isNeeded = await syncService.isAutoSyncNeeded();
      
      if (isNeeded) {
        console.log('AutoSyncService: Sync needed, initiating full sync');
        await this.performSync();
        return true;
      } else {
        console.log('AutoSyncService: Sync not needed at this time');
        return false;
      }
    } catch (error) {
      console.error('AutoSyncService: Error checking/performing sync:', error);
      return false;
    } finally {
      this.isPerformingSync = false;
    }
  }

  /**
   * Perform a full sync
   * @returns {Promise<Object>} Sync results
   */
  async performSync() {
    try {
      console.log('AutoSyncService: Performing full sync');
      const results = await syncService.performFullSync();
      
      // Add timestamp to results
      results.timestamp = new Date().toISOString();
      
      console.log('AutoSyncService: Sync completed with results:', results);
      return results;
    } catch (error) {
      console.error('AutoSyncService: Error during sync:', error);
      throw error;
    }
  }

  /**
   * Perform a manual sync triggered by user
   * @returns {Promise<Object>} Sync results
   */
  async performManualSync() {
    // Even for manual sync, prevent concurrent operations
    if (this.isPerformingSync) {
      console.log('AutoSyncService: Sync already in progress, cannot start manual sync');
      throw new Error('Sync already in progress');
    }
    
    try {
      console.log('AutoSyncService: Starting manual sync');
      this.isPerformingSync = true;
      
      // Perform the sync
      const results = await syncService.performFullSync();
      
      // Update settings
      await settingsService.addSyncHistoryEntry(
        { added: results.importRestaurants.added, updated: results.importRestaurants.updated }, 
        results.importRestaurants.success ? 'success' : 'error'
      );
      
      console.log('AutoSyncService: Manual sync completed with results:', results);
      return results;
    } catch (error) {
      console.error('AutoSyncService: Error during manual sync:', error);
      
      // Add error to sync history
      await settingsService.addSyncHistoryEntry({ error: error.message }, 'error');
      
      throw error;
    } finally {
      this.isPerformingSync = false;
    }
  }

  /**
   * Update the sync interval
   * @param {number} minutes New interval in minutes
   * @returns {Promise<number>} The applied interval (may be adjusted)
   */
  async updateSyncInterval(minutes) {
    const interval = await this.setupSyncInterval(minutes);
    console.log(`AutoSyncService: Updated sync interval to ${interval} minutes`);
    return interval;
  }

  /**
   * Stop automatic synchronization
   */
  stop() {
    if (this.syncIntervalId) {
      console.log('AutoSyncService: Stopping auto-sync');
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }
  }
}

const autoSyncService = new AutoSyncService();
export default autoSyncService;
