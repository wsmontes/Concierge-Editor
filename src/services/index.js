/**
 * Services index file
 * Exports all service modules for easy import elsewhere
 * 
 * @module Services
 */

import databaseService from './db/DatabaseService.js';
import settingsService from './SettingsService.js';
import syncService from './SyncService.js';
import autoSyncService from './AutoSyncService.js';

// Ensure database is initialized before exporting
databaseService.ensureDatabase()
  .then(() => {
    // Initialize auto-sync service after database is ready
    autoSyncService.initialize().catch(error => {
      console.error('Failed to initialize AutoSyncService:', error);
    });
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
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
