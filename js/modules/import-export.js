/**
 * Import/Export Module - Handles data import and export functionality
 * Dependencies: ServiceRegistry, UIUtils, ErrorHandlingService
 * Provides UI for importing and exporting application data
 */

const ImportExportModule = (function() {
    // DOM Elements
    const importFileInput = document.getElementById('import-file');
    const importDataBtn = document.getElementById('import-data');
    const selectedFileDisplay = document.getElementById('selected-file');
    const importStatusContainer = document.getElementById('import-status');
    const progressBarContainer = document.querySelector('.progress-bar-container');
    const progressBar = document.querySelector('.progress-bar');
    const exportAllDataBtn = document.getElementById('export-all-data');
    const exportFormatSelect = document.getElementById('export-format');
    const recentImportsList = document.getElementById('import-history');
    
    // Initialize
    function init() {
        bindEventListeners();
        loadImportHistory();
    }
    
    function bindEventListeners() {
        // Import file selection
        if (importDataBtn) {
            importDataBtn.addEventListener('click', () => {
                importFileInput.click();
            });
        }
        
        if (importFileInput) {
            importFileInput.addEventListener('change', handleImportFileSelection);
        }
        
        // Export data
        if (exportAllDataBtn) {
            exportAllDataBtn.addEventListener('click', handleExportData);
        }
        
        // Delegate clicks on bulk export in restaurant section
        document.body.addEventListener('click', function(e) {
            if (e.target && e.target.id === 'bulk-export') {
                handleBulkExport();
            }
        });
    }
    
    // Handle file selection for import
    function handleImportFileSelection(event) {
        const file = event.target.files[0];
        
        if (!file) {
            selectedFileDisplay.textContent = 'No file selected';
            return;
        }
        
        selectedFileDisplay.textContent = file.name;
        
        // Show progress UI
        importStatusContainer.style.display = 'block';
        importStatusContainer.textContent = 'Preparing to import data...';
        progressBarContainer.style.display = 'block';
        progressBar.style.width = '10%';
        
        // Determine if it's a JSON or ZIP file
        if (file.name.endsWith('.json')) {
            processJSONImport(file);
        } else if (file.name.endsWith('.zip')) {
            processZIPImport(file);
        } else {
            showImportError('Unsupported file format. Please select a JSON or ZIP file.');
        }
    }
    
    // Process JSON import
    async function processJSONImport(file) {
        try {
            // Update status
            importStatusContainer.textContent = 'Reading JSON file...';
            progressBar.style.width = '20%';
            
            // Read the file
            const fileContent = await readFileAsText(file);
            progressBar.style.width = '40%';
            
            // Parse JSON
            importStatusContainer.textContent = 'Parsing data...';
            const jsonData = JSON.parse(fileContent);
            progressBar.style.width = '60%';
            
            // Validate and process data using ServiceRegistry instead of BusinessLogicModule
            importStatusContainer.textContent = 'Importing data into database...';
            
            // Get required services
            const restaurantService = ServiceRegistry.getRestaurantService();
            const conceptService = ServiceRegistry.getConceptService();
            const curatorService = ServiceRegistry.getCuratorService();
            
            // Import data using services
            const result = await importData(jsonData);
            progressBar.style.width = '100%';
            
            if (result.success) {
                showImportSuccess(result);
            } else {
                showImportError(result.message);
            }
            
            // Refresh import history
            loadImportHistory();
            
            // Update dashboard statistics if available
            if (typeof DashboardModule !== 'undefined' && typeof DashboardModule.refreshDashboard === 'function') {
                DashboardModule.refreshDashboard();
            }
        } catch (error) {
            ErrorHandlingService.handleError(error, 'Processing JSON import');
            showImportError(`Error importing data: ${error.message}`);
        }
    }
    
    /**
     * Import data using service layer
     * @param {Object} data - Data to import
     * @return {Promise<Object>} Import result
     */
    async function importData(data) {
        try {
            // Get needed services
            const storageService = ServiceRegistry.getStorageService();
            
            // Process each data type using appropriate service
            const stats = {
                restaurants: 0,
                concepts: 0,
                curators: 0,
                photos: 0,
                imagesProcessed: 0
            };
            
            // Import restaurants if present
            if (data.restaurants && Array.isArray(data.restaurants)) {
                const restaurantService = ServiceRegistry.getRestaurantService();
                await restaurantService.importAll(data.restaurants);
                stats.restaurants = data.restaurants.length;
            }
            
            // Import concepts if present
            if (data.concepts && Array.isArray(data.concepts)) {
                const conceptService = ServiceRegistry.getConceptService();
                await conceptService.importAll(data.concepts);
                stats.concepts = data.concepts.length;
            }
            
            // Other imports...
            
            return {
                success: true,
                message: 'Data imported successfully',
                stats
            };
        } catch (error) {
            console.error('Error importing data:', error);
            return {
                success: false,
                message: `Import failed: ${error.message}`
            };
        }
    }
    
    // Process ZIP import (contains JSON + images)
    async function processZIPImport(file) {
        try {
            // Check if JSZip is available
            if (typeof JSZip !== 'function') {
                throw new Error('JSZip library is required but not available');
            }
            
            // Update status
            importStatusContainer.textContent = 'Reading ZIP file...';
            progressBar.style.width = '20%';
            
            // Read the file
            const zipInstance = new JSZip();
            const zipContent = await zipInstance.loadAsync(file);
            progressBar.style.width = '30%';
            
            // Look for data.json or similar file
            let jsonFile;
            zipContent.forEach((path, entry) => {
                if (path.endsWith('.json') && !jsonFile) {
                    jsonFile = entry;
                }
            });
            
            if (!jsonFile) {
                throw new Error('No JSON data file found in ZIP archive');
            }
            
            // Read and parse JSON file
            importStatusContainer.textContent = 'Parsing data file...';
            const jsonData = JSON.parse(await jsonFile.async('string'));
            progressBar.style.width = '50%';
            
            // Add metadata with original filename
            jsonData.metadata = jsonData.metadata || {};
            jsonData.metadata.filename = file.name;
            
            // Process the data with the ZIP file for images using BusinessLogicModule
            importStatusContainer.textContent = 'Importing data and processing images...';
            const result = await BusinessLogicModule.importData(jsonData, file);
            progressBar.style.width = '100%';
            
            if (result.success) {
                showImportSuccess(result);
            } else {
                showImportError(result.message);
            }
            
            // Refresh import history
            loadImportHistory();
            
            // Update dashboard statistics if available
            if (typeof DashboardModule !== 'undefined' && typeof DashboardModule.refreshDashboard === 'function') {
                DashboardModule.refreshDashboard();
            }
        } catch (error) {
            ErrorHandlingService.handleError(error, 'Processing ZIP import');
            showImportError(`Error processing ZIP file: ${error.message}`);
        }
    }
    
    // Utility to read file as text
    function readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e.target.error);
            reader.readAsText(file);
        });
    }
    
    // Show import success message and stats
    function showImportSuccess(result) {
        importStatusContainer.innerHTML = `
            <div class="success-message">
                <i class="fas fa-check-circle"></i>
                <span>${result.message}</span>
            </div>
            <div class="import-stats">
                <div>Restaurants: ${result.stats.restaurants || 0}</div>
                <div>Concepts: ${result.stats.concepts || 0}</div>
                <div>Photos: ${result.stats.photos || 0}</div>
                <div>Images processed: ${result.stats.imagesProcessed || 0}</div>
                ${result.stats.imageErrors > 0 ? `<div class="error-text">Image errors: ${result.stats.imageErrors}</div>` : ''}
            </div>
        `;
        
        // Show notification
        UIUtils.showNotification(`Import successful: ${result.stats.restaurants || 0} restaurants, ${result.stats.imagesProcessed || 0} images`, 'success');
        
        // Reset file input to allow importing the same file again
        importFileInput.value = '';
    }
    
    // Show import error message
    function showImportError(message) {
        progressBar.style.width = '100%';
        progressBarContainer.classList.add('error');
        
        importStatusContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <span>${ValidationService.sanitizeString(message)}</span>
            </div>
        `;
        
        // Show notification
        UIUtils.showNotification(`Import failed: ${message}`, 'error');
        
        // Reset file input after a few seconds
        setTimeout(() => {
            importFileInput.value = '';
            progressBarContainer.classList.remove('error');
        }, 5000);
    }
    
    // Load and display import history
    function loadImportHistory() {
        // This will be handled by an API from BusinessLogicModule in the future
        // For now, we'll just show the history from localStorage
        if (!recentImportsList) return;
        
        const importHistory = JSON.parse(localStorage.getItem('importHistory') || '[]');
        
        if (importHistory.length === 0) {
            recentImportsList.innerHTML = '<li class="empty-list">No import history available</li>';
            
            // Also update recent imports on dashboard if it exists
            const dashboardRecentImports = document.getElementById('recent-imports');
            if (dashboardRecentImports) {
                dashboardRecentImports.innerHTML = '<li class="empty-list">No recent imports</li>';
            }
            return;
        }
        
        // Update import history panel
        recentImportsList.innerHTML = importHistory.map(entry => `
            <li class="activity-item">
                <div class="activity-icon"><i class="fas fa-file-import"></i></div>
                <div class="activity-details">
                    <div class="activity-title">${ValidationService.sanitizeString(entry.filename)}</div>
                    <div class="activity-meta">
                        ${new Date(entry.timestamp).toLocaleString()}
                    </div>
                    <div class="activity-stats">
                        ${entry.stats.restaurants} restaurants, ${entry.stats.concepts} concepts, ${entry.stats.imagesProcessed || 0} images
                    </div>
                </div>
            </li>
        `).join('');
        
        // Update recent imports on dashboard if it exists
        const dashboardRecentImports = document.getElementById('recent-imports');
        if (dashboardRecentImports) {
            dashboardRecentImports.innerHTML = importHistory.slice(0, 5).map(entry => `
                <li class="activity-item">
                    <div class="activity-icon"><i class="fas fa-file-import"></i></div>
                    <div class="activity-details">
                        <div class="activity-title">${ValidationService.sanitizeString(entry.filename)}</div>
                        <div class="activity-meta">
                            ${new Date(entry.timestamp).toLocaleString()}
                        </div>
                    </div>
                </li>
            `).join('');
        }
    }
    
    // Handle export all data
    async function handleExportData() {
        try {
            if (exportAllDataBtn) {
                exportAllDataBtn.disabled = true;
                exportAllDataBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting...';
            }
            
            // Get all data from services instead of BusinessLogicModule
            const storageService = ServiceRegistry.getStorageService();
            const data = await storageService.exportAllData();
            
            // Handle different export formats
            const format = exportFormatSelect ? exportFormatSelect.value : 'json';
            let exportData, filename, mimeType;
            
            if (format === 'csv') {
                exportData = convertToCSV(data);
                filename = `concierge-export-${new Date().toISOString().slice(0,10)}.csv`;
                mimeType = 'text/csv';
            } else {
                exportData = JSON.stringify(data, null, 2);
                filename = `concierge-export-${new Date().toISOString().slice(0,10)}.json`;
                mimeType = 'application/json';
            }
            
            // Create download
            downloadFile(exportData, filename, mimeType);
            
            // Show notification
            UIUtils.showNotification(`Data exported successfully as ${format.toUpperCase()}`, 'success');
        } catch (error) {
            ErrorHandlingService.handleError(error, 'Exporting data');
            UIUtils.showNotification(`Export failed: ${error.message}`, 'error');
        } finally {
            if (exportAllDataBtn) {
                exportAllDataBtn.disabled = false;
                exportAllDataBtn.innerHTML = '<i class="fas fa-file-export"></i> Export All Data';
            }
        }
    }
    
    // Handle bulk export (selected restaurants)
    async function handleBulkExport() {
        try {
            // Get selected restaurants from RestaurantModule
            if (typeof RestaurantModule === 'undefined' || typeof RestaurantModule.getSelectedRestaurants !== 'function') {
                throw new Error('Restaurant selection functionality not available');
            }
            
            const selectedIds = RestaurantModule.getSelectedRestaurants();
            
            if (!selectedIds || selectedIds.length === 0) {
                UIUtils.showNotification('Please select restaurants to export', 'warning');
                return;
            }
            
            // Show notification
            UIUtils.showNotification(`Preparing export of ${selectedIds.length} restaurants...`, 'info');
            
            // Export only the selected restaurants using service
            const restaurantService = ServiceRegistry.getRestaurantService();
            const data = await restaurantService.exportSelected(selectedIds);
            
            // Create download
            const filename = `concierge-export-selected-${selectedIds.length}-restaurants-${new Date().toISOString().slice(0,10)}.json`;
            downloadFile(JSON.stringify(data, null, 2), filename, 'application/json');
            
            // Show success notification
            UIUtils.showNotification(`Exported ${selectedIds.length} restaurants successfully`, 'success');
            
        } catch (error) {
            ErrorHandlingService.handleError(error, 'Bulk export restaurants');
            UIUtils.showNotification(`Export failed: ${error.message}`, 'error');
        }
    }
    
    // Utility to download file
    function downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }
    
    // Convert data to CSV format (basic implementation)
    function convertToCSV(data) {
        // Placeholder implementation - would need to be more sophisticated for real use
        let csv = '';
        
        // Handle restaurants
        if (data.restaurants && data.restaurants.length > 0) {
            // Get headers from first object
            const headers = Object.keys(data.restaurants[0]).join(',');
            csv += 'Restaurants\n' + headers + '\n';
            
            // Add data rows
            data.restaurants.forEach(restaurant => {
                csv += Object.values(restaurant).map(value => {
                    // Handle commas in values
                    if (typeof value === 'string' && value.includes(',')) {
                        return `"${value}"`;
                    }
                    return value;
                }).join(',') + '\n';
            });
            
            csv += '\n';
        }
        
        // Repeat for other data types...
        
        return csv;
    }
    
    // Public API
    return {
        init,
        handleImportFileSelection,
        handleExportData,
        handleBulkExport
    };
})();
