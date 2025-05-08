/**
 * Import/Export Module - Handles data import and export functionality
 * Dependencies: JSZip, UIModule, DataModule, StorageModule, RestaurantModule
 */

const ImportExportModule = (function() {
    /**
     * Initialize import/export functionality
     */
    function init() {
        const importButton = document.getElementById('import-data');
        const exportButton = document.getElementById('export-data');
        const importFileInput = document.getElementById('import-file');
        const exportAllButton = document.getElementById('export-all-data');
        
        if (importButton && importFileInput) {
            importButton.addEventListener('click', function() {
                importFileInput.click();
            });
            
            importFileInput.addEventListener('change', function(e) {
                if (this.files && this.files.length > 0) {
                    const file = this.files[0];
                    const fileType = file.name.split('.').pop().toLowerCase();
                    
                    // Update UI with file name
                    const selectedFileElement = document.getElementById('selected-file');
                    if (selectedFileElement) {
                        selectedFileElement.textContent = file.name;
                    }
                    
                    // Show import progress UI
                    const importStatus = document.getElementById('import-status');
                    const progressContainer = document.querySelector('.progress-bar-container');
                    const progressBar = document.querySelector('.progress-bar');
                    
                    if (importStatus) {
                        importStatus.textContent = 'Preparing to import data...';
                        importStatus.style.display = 'block';
                    }
                    
                    if (progressContainer) {
                        progressContainer.style.display = 'block';
                    }
                    
                    if (progressBar) {
                        progressBar.style.width = '0%';
                    }
                    
                    if (fileType === 'json') {
                        // Handle JSON import
                        handleJsonImport(file, updateProgress);
                    } else if (fileType === 'zip') {
                        // Handle ZIP import
                        handleZipImport(file, updateProgress);
                    } else {
                        UIModule.showToast('Unsupported file format. Please upload a JSON or ZIP file.', 'error');
                    }
                }
            });
        }
        
        if (exportButton) {
            exportButton.addEventListener('click', function() {
                // Get selected restaurants
                const selectedRestaurants = RestaurantModule.getSelectedRestaurants();
                
                if (selectedRestaurants.length > 0) {
                    exportRestaurantData(selectedRestaurants);
                } else {
                    UIModule.showToast('Please select at least one restaurant to export', 'info');
                }
            });
        }
        
        if (exportAllButton) {
            exportAllButton.addEventListener('click', function() {
                // Get all restaurants
                const restaurants = JSON.parse(localStorage.getItem('restaurants') || '[]');
                const restaurantIds = restaurants.map(r => r.id);
                
                if (restaurantIds.length > 0) {
                    exportRestaurantData(restaurantIds);
                } else {
                    UIModule.showToast('No restaurants found to export', 'info');
                }
            });
        }
    }

    /**
     * Update progress bar during import
     * @param {number} value - Progress value (0-100)
     * @param {string} statusText - Optional status text
     */
    function updateProgress(value, statusText) {
        const progressBar = document.querySelector('.progress-bar');
        if (progressBar) {
            progressBar.style.width = `${value}%`;
        }
        
        if (statusText) {
            const importStatus = document.getElementById('import-status');
            if (importStatus) {
                importStatus.textContent = statusText;
            }
        }
    }
    
    /**
     * Handle JSON file import
     * @param {File} file - The JSON file to import
     * @param {Function} progressCallback - Callback for progress updates
     */
    function handleJsonImport(file, progressCallback) {
        progressCallback(10, 'Reading JSON file...');
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                progressCallback(20, 'Parsing JSON data...');
                const data = JSON.parse(e.target.result);
                
                // Validate the data structure
                if (!DataModule.validateImportData(data)) {
                    UIModule.showToast('Invalid data format. Please check your import file.', 'error');
                    progressCallback(0, 'Import failed: Invalid data format');
                    return;
                }
                
                progressCallback(40, 'Validating data structure...');
                
                // Process and store the imported data
                DataModule.processImportedData(data)
                    .then(() => {
                        progressCallback(90, 'Finalizing import...');
                        
                        // Record in import history
                        addToImportHistory({
                            fileName: file.name,
                            timestamp: new Date().toISOString(),
                            recordCount: {
                                restaurants: data.restaurants ? data.restaurants.length : 0,
                                concepts: data.concepts ? data.concepts.length : 0,
                                photos: 0
                            }
                        });
                        
                        progressCallback(100, 'Import completed successfully');
                        
                        setTimeout(() => {
                            // Hide progress UI after a delay
                            const progressContainer = document.querySelector('.progress-bar-container');
                            if (progressContainer) {
                                progressContainer.style.display = 'none';
                            }
                            
                            UIModule.showToast('Data imported successfully!', 'success');
                            RestaurantModule.updateRestaurantListings();
                        }, 1000);
                    })
                    .catch(error => {
                        console.error('Import error:', error);
                        UIModule.showToast('Error importing data: ' + error.message, 'error');
                        progressCallback(0, 'Import failed: ' + error.message);
                    });
                
            } catch (error) {
                console.error('Parse error:', error);
                UIModule.showToast('Error parsing JSON file: ' + error.message, 'error');
                progressCallback(0, 'Import failed: Parse error');
            }
        };
        
        reader.onerror = function() {
            UIModule.showToast('Error reading file', 'error');
            progressCallback(0, 'Import failed: File read error');
        };
        
        reader.readAsText(file);
    }

    /**
     * Handle ZIP file import containing JSON data and images
     * @param {File} file - The ZIP file to import
     * @param {Function} progressCallback - Callback for progress updates
     */
    async function handleZipImport(file, progressCallback) {
        try {
            progressCallback(5, 'Loading ZIP file...');
            
            // Initialize database for storing images
            await StorageModule.initDatabase();
            
            progressCallback(10, 'Extracting ZIP contents...');
            const zip = new JSZip();
            const zipContents = await zip.loadAsync(file);
            
            // Look for JSON file at root level
            let jsonFile = null;
            let jsonFileName = null;
            
            // Find the JSON data file (typically data.json or similar)
            for (const fileName in zipContents.files) {
                if (fileName.endsWith('.json') && !fileName.includes('/')) {
                    jsonFileName = fileName;
                    jsonFile = zipContents.files[fileName];
                    break;
                }
            }
            
            if (!jsonFile) {
                UIModule.showToast('No JSON data file found in ZIP archive', 'error');
                progressCallback(0, 'Import failed: No JSON data found');
                return;
            }
            
            // Read and parse the JSON file
            progressCallback(15, `Reading JSON data from ${jsonFileName}...`);
            const jsonContent = await jsonFile.async('text');
            const data = JSON.parse(jsonContent);
            
            // Validate the data structure
            if (!DataModule.validateImportData(data)) {
                UIModule.showToast('Invalid data format in JSON file', 'error');
                progressCallback(0, 'Import failed: Invalid data format');
                return;
            }
            
            // Process image references if present
            let imagesToProcess = [];
            if (data.restaurantPhotos && data.restaurantPhotos.length > 0) {
                progressCallback(20, 'Processing image references...');
                
                // Build a list of images to extract
                imagesToProcess = data.restaurantPhotos.map(photo => ({
                    id: photo.id.toString(),
                    restaurantId: photo.restaurantId,
                    photoDataRef: photo.photoDataRef,
                    filePath: photo.photoDataRef // Path inside ZIP
                }));
                
                progressCallback(25, `Found ${imagesToProcess.length} images to extract`);
            }
            
            // Process and store the JSON data
            progressCallback(30, 'Storing restaurant data...');
            await DataModule.processImportedData(data);
            
            // Extract and store images
            if (imagesToProcess.length > 0) {
                progressCallback(50, 'Extracting images from ZIP...');
                
                let processedImages = 0;
                const totalImages = imagesToProcess.length;
                
                for (const imageInfo of imagesToProcess) {
                    // Update progress for each image
                    const imageProgress = 50 + Math.floor((processedImages / totalImages) * 40);
                    progressCallback(imageProgress, `Extracting image ${processedImages + 1} of ${totalImages}...`);
                    
                    // Get the image file from the ZIP
                    const imageFile = zipContents.files[imageInfo.filePath];
                    
                    if (imageFile) {
                        try {
                            // Extract the image as a blob
                            const imageBlob = await imageFile.async('blob');
                            
                            // Store the image in IndexedDB
                            await StorageModule.storeImage({
                                id: imageInfo.id,
                                restaurantId: imageInfo.restaurantId,
                                photoDataRef: imageInfo.photoDataRef,
                                blob: imageBlob
                            });
                            
                            processedImages++;
                        } catch (imageError) {
                            console.error(`Error processing image ${imageInfo.filePath}:`, imageError);
                            // Continue with other images
                        }
                    } else {
                        console.warn(`Image file not found in ZIP: ${imageInfo.filePath}`);
                    }
                }
                
                progressCallback(90, `Successfully extracted ${processedImages} of ${totalImages} images`);
            }
            
            // Record in import history
            addToImportHistory({
                fileName: file.name,
                timestamp: new Date().toISOString(),
                recordCount: {
                    restaurants: data.restaurants ? data.restaurants.length : 0,
                    concepts: data.concepts ? data.concepts.length : 0,
                    photos: imagesToProcess.length
                }
            });
            
            progressCallback(100, 'Import completed successfully');
            
            setTimeout(() => {
                // Hide progress UI after a delay
                const progressContainer = document.querySelector('.progress-bar-container');
                if (progressContainer) {
                    progressContainer.style.display = 'none';
                }
                
                UIModule.showToast('ZIP data imported successfully!', 'success');
                
                // Update UI
                RestaurantModule.updateRestaurantListings();
                updateImportHistoryUI();
            }, 1000);
            
        } catch (error) {
            console.error('ZIP import error:', error);
            UIModule.showToast('Error importing ZIP file: ' + error.message, 'error');
            progressCallback(0, 'Import failed: ' + error.message);
        }
    }
    
    /**
     * Add an entry to the import history
     * @param {Object} importInfo - Information about the import
     */
    function addToImportHistory(importInfo) {
        const history = JSON.parse(localStorage.getItem('importHistory') || '[]');
        history.unshift(importInfo); // Add to beginning of array
        
        // Limit history size
        if (history.length > 10) {
            history.length = 10;
        }
        
        localStorage.setItem('importHistory', JSON.stringify(history));
        
        // Update the UI
        updateImportHistoryUI();
    }
    
    /**
     * Update the import history UI
     */
    function updateImportHistoryUI() {
        const historyContainer = document.getElementById('import-history');
        if (!historyContainer) return;
        
        const history = JSON.parse(localStorage.getItem('importHistory') || '[]');
        
        if (history.length === 0) {
            historyContainer.innerHTML = '<li class="empty-list">No import history available</li>';
            return;
        }
        
        historyContainer.innerHTML = '';
        
        history.forEach(item => {
            const date = new Date(item.timestamp).toLocaleString();
            const historyItem = document.createElement('li');
            historyItem.innerHTML = `
                <div class="activity-item">
                    <div class="activity-icon"><i class="fas fa-file-import"></i></div>
                    <div class="activity-details">
                        <h4>${item.fileName}</h4>
                        <p>Imported ${item.recordCount.restaurants} restaurants, ${item.recordCount.concepts} concepts, ${item.recordCount.photos} photos</p>
                        <span class="activity-time">${date}</span>
                    </div>
                </div>
            `;
            historyContainer.appendChild(historyItem);
        });
    }

    /**
     * Export restaurant data to JSON
     * @param {Array} restaurantIds - Array of restaurant IDs to export
     */
    function exportRestaurantData(restaurantIds) {
        // Fetch all the necessary data
        const restaurants = JSON.parse(localStorage.getItem('restaurants') || '[]')
            .filter(r => restaurantIds.includes(r.id));
        
        const restaurantConcepts = JSON.parse(localStorage.getItem('restaurantConcepts') || '[]')
            .filter(rc => restaurantIds.includes(rc.restaurantId));
        
        const conceptIds = restaurantConcepts.map(rc => rc.conceptId);
        const concepts = JSON.parse(localStorage.getItem('concepts') || '[]')
            .filter(c => conceptIds.includes(c.id));
        
        const curatorIds = [...new Set(restaurants.map(r => r.curatorId))];
        const curators = JSON.parse(localStorage.getItem('curators') || '[]')
            .filter(c => curatorIds.includes(c.id));
        
        const locations = JSON.parse(localStorage.getItem('restaurantLocations') || '[]')
            .filter(l => restaurantIds.includes(l.restaurantId));
        
        // Get the export format
        const exportFormat = document.getElementById('export-format')?.value || 'json';
        
        if (exportFormat === 'json') {
            // Compile export data
            const exportData = {
                restaurants: restaurants,
                restaurantConcepts: restaurantConcepts,
                concepts: concepts,
                curators: curators,
                restaurantLocations: locations
            };
            
            // Create and download the file
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], {type: 'application/json'});
            const url = URL.createObjectURL(dataBlob);
            
            const downloadLink = document.createElement('a');
            downloadLink.href = url;
            downloadLink.download = 'restaurant_export_' + new Date().toISOString().split('T')[0] + '.json';
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            
            UIModule.showToast(`Exported ${restaurants.length} restaurants successfully`, 'success');
        } else if (exportFormat === 'csv') {
            // Generate CSV format (simplified for now)
            exportCSV(restaurants, concepts, restaurantConcepts);
        }
    }
    
    /**
     * Export data in CSV format
     * @param {Array} restaurants - Restaurant data
     * @param {Array} concepts - Concept data
     * @param {Array} restaurantConcepts - Restaurant-concept relationships
     */
    function exportCSV(restaurants, concepts, restaurantConcepts) {
        // Create restaurant CSV with linked concepts
        let csv = 'Restaurant ID,Name,Curator ID,Timestamp,Description,Concepts\n';
        
        restaurants.forEach(restaurant => {
            // Get concepts for this restaurant
            const restaurantConceptIds = restaurantConcepts
                .filter(rc => rc.restaurantId === restaurant.id)
                .map(rc => rc.conceptId);
                
            const restaurantConceptValues = concepts
                .filter(c => restaurantConceptIds.includes(c.id))
                .map(c => `${c.category}: ${c.value}`);
                
            // Escape fields with quotes if they contain commas
            const escapedName = restaurant.name.includes(',') ? `"${restaurant.name}"` : restaurant.name;
            const escapedDesc = restaurant.description ? 
                (restaurant.description.includes(',') ? `"${restaurant.description}"` : restaurant.description) : '';
            const escapedConcepts = restaurantConceptValues.length > 0 ? 
                `"${restaurantConceptValues.join('; ')}"` : '';
                
            csv += `${restaurant.id},${escapedName},${restaurant.curatorId},${restaurant.timestamp},${escapedDesc},${escapedConcepts}\n`;
        });
        
        // Create and download CSV file
        const dataBlob = new Blob([csv], {type: 'text/csv'});
        const url = URL.createObjectURL(dataBlob);
        
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = 'restaurant_export_' + new Date().toISOString().split('T')[0] + '.csv';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        UIModule.showToast(`Exported ${restaurants.length} restaurants to CSV`, 'success');
    }

    // Public API
    return {
        init: init,
        handleJsonImport: handleJsonImport,
        handleZipImport: handleZipImport,
        updateImportHistoryUI: updateImportHistoryUI
    };
})();
