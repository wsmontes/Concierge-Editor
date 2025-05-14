/**
 * Services index file
 * Exports all service modules for easy import elsewhere
 * 
 * @module Services
 */

import databaseService from './db/DatabaseService';
import settingsService from './SettingsService';
import syncService from './SyncService';
import autoSyncService from './AutoSyncService';

// Initialize auto-sync service when imported
autoSyncService.initialize().catch(error => {
  console.error('Failed to initialize AutoSyncService:', error);
});

// Export all services
export {
  databaseService,
  settingsService,
  syncService,
  autoSyncService
};

// Default export for convenience
export default {
  database: databaseService,
  settings: settingsService,
  sync: syncService,
  autoSync: autoSyncService
};
