/**
 * import-export.js
 * 
 * Purpose: Implements the import/export functionality for the CMS, allowing
 * users to backup or restore database content.
 * 
 * Dependencies:
 *   - concierge-data.js - For database operations
 *   - import-export-manager.js - For import/export operations
 *   - ui-manager.js - For UI components
 *   - JSZip - For handling ZIP files (loaded externally)
 */

const ImportExportView = (() => {
    // View state management
    const state = {
        exportFormat: 'json',
        exportOptions: {
            pretty: true
        },
        importedData: null,
        validationResult: null,
        importProgress: {
            status: 'idle', // idle, validating, importing, success, error
            message: ''
        }
    };
    
    /**
     * Initializes the import/export view
     * @param {HTMLElement} container - The container element to render the view in
     */
    const initialize = async (container) => {
        UIManager.setPageTitle('Import/Export');
        
        // Render the main view
        renderImportExportView(container);
        
        // Set up event listeners
        setupEventListeners();
    };
    
    /**
     * Renders the main import/export view
     * @param {HTMLElement} container - The container element to render the view in
     */
    const renderImportExportView = (container) => {
        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h1 class="mb-0">Import/Export</h1>
                <div class="database-connection">
                    <span id="dbConnectionStatus" class="badge bg-secondary">
                        Checking connection...
                    </span>
                </div>
            </div>
            
            <div class="row mb-4">
                <div class="col-md-6 mb-4">
                    <!-- Export Panel -->
                    <div class="card h-100">
                        <div class="card-header">
                            <h5 class="card-title mb-0">Export Data</h5>
                        </div>
                        <div class="card-body">
                            <p>Export all database content for backup or transfer to another system.</p>
                            
                            <form id="exportForm">
                                <div class="mb-3">
                                    <label for="exportFormat" class="form-label">Export Format</label>
                                    <select id="exportFormat" class="form-select">
                                        <option value="json" selected>JSON</option>
                                        <option value="zip">ZIP Archive (with media files)</option>
                                    </select>
                                    <div class="form-text">Select ZIP to include images and media files.</div>
                                </div>
                                
                                <div class="mb-3">
                                    <label for="exportFilename" class="form-label">Filename</label>
                                    <input type="text" id="exportFilename" class="form-control" value="concierge-data-export">
                                </div>
                                
                                <div class="mb-3 form-check">
                                    <input type="checkbox" class="form-check-input" id="prettyPrint" checked>
                                    <label class="form-check-label" for="prettyPrint">Pretty Print</label>
                                    <div class="form-text">Makes the export file human-readable but slightly larger.</div>
                                </div>
                                
                                <div class="mb-3 form-check" id="includeMediaContainer">
                                    <input type="checkbox" class="form-check-input" id="includeMedia" checked>
                                    <label class="form-check-label" for="includeMedia">Include Media Files</label>
                                    <div class="form-text">Include audio files and additional media (ZIP format only).</div>
                                </div>
                            </form>
                        </div>
                        <div class="card-footer">
                            <div class="d-flex justify-content-between">
                                <button id="btnExportToFile" class="btn btn-primary">
                                    <i class="bi bi-download"></i> Export to File
                                </button>
                                <button id="btnExportToText" class="btn btn-outline-secondary">
                                    <i class="bi bi-file-earmark-text"></i> Export to Text
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-6 mb-4">
                    <!-- Import Panel -->
                    <div class="card h-100">
                        <div class="card-header">
                            <h5 class="card-title mb-0">Import Data</h5>
                        </div>
                        <div class="card-body">
                            <p>Import data from a previously exported file. <strong class="text-danger">This will overwrite your current data.</strong></p>
                            <div class="import-tabs mb-3">
                                <ul class="nav nav-tabs" id="importTabs" role="tablist">
                                    <li class="nav-item" role="presentation">
                                        <button class="nav-link active" id="file-tab" data-bs-toggle="tab" data-bs-target="#file-content" type="button">Import from File</button>
                                    </li>
                                    <li class="nav-item" role="presentation">
                                        <button class="nav-link" id="text-tab" data-bs-toggle="tab" data-bs-target="#text-content" type="button">Import from Text</button>
                                    </li>
                                </ul>
                                <div class="tab-content mt-3" id="importTabsContent">
                                    <div class="tab-pane fade show active" id="file-content" role="tabpanel">
                                        <div class="mb-3">
                                            <label for="importFile" class="form-label">Select File</label>
                                            <input type="file" class="form-control" id="importFile" accept=".json,.zip">
                                            <div class="form-text">Supported formats: JSON (.json), ZIP archive (.zip)</div>
                                        </div>
                                        <div class="mb-3">
                                            <div class="alert alert-info small">
                                                <strong><i class="bi bi-info-circle"></i> ZIP File Requirements:</strong>
                                                <ul class="mb-0 mt-1">
                                                    <li>Should contain a <code>data.json</code> file (or any JSON file) at the root</li>
                                                    <li>Images should be in an <code>images</code> folder (optional)</li>
                                                    <li>Media files should be in a <code>media</code> folder (optional)</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="tab-pane fade" id="text-content" role="tabpanel">
                                        <div class="mb-3">
                                            <label for="importText" class="form-label">Paste JSON Data</label>
                                            <textarea id="importText" class="form-control" rows="10" placeholder="Paste your JSON data here..."></textarea>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div id="validationResults" class="d-none">
                                <h6>Validation Results</h6>
                                <div id="validationContent" class="alert"></div>
                            </div>
                        </div>
                        <div class="card-footer">
                            <div class="d-flex justify-content-between align-items-center">
                                <button id="btnValidateImport" class="btn btn-outline-primary">
                                    Validate Import Data
                                </button>
                                <button id="btnImport" class="btn btn-danger" disabled>
                                    <i class="bi bi-upload"></i> Import Data
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Export Text Preview Modal -->
            <div class="modal fade" id="exportTextModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-lg modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Export Data Preview</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <textarea id="exportTextPreview" class="form-control font-monospace" rows="15" readonly></textarea>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            <button type="button" class="btn btn-primary" id="btnCopyExport">Copy to Clipboard</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Check database connection status
        updateConnectionStatus();
    };
    
    /**
     * Updates the database connection status indicator
     */ 
    const updateConnectionStatus = () => {
        const statusElement = document.getElementById('dbConnectionStatus');
        if (!statusElement) return;
        
        const isConnected = ConciergeData.getDatabase().db !== null;
        
        if (isConnected) {
            statusElement.className = 'badge bg-success';
            statusElement.innerHTML = '<i class="bi bi-check-circle-fill"></i> Database Connected';
        } else {
            statusElement.className = 'badge bg-danger';
            statusElement.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i> Database Disconnected';
        }
    };
    
    /**
     * Sets up event listeners for the view
     */
    const setupEventListeners = () => {
        // Export buttons
        document.getElementById('btnExportToFile')?.addEventListener('click', handleExportToFile);
        document.getElementById('btnExportToText')?.addEventListener('click', handleExportToText);
        document.getElementById('btnCopyExport')?.addEventListener('click', handleCopyExport);
        
        // Import buttons
        document.getElementById('btnValidateImport')?.addEventListener('click', handleValidateImport);
        document.getElementById('btnImport')?.addEventListener('click', handleImport);
        
        // Format change
        document.getElementById('exportFormat')?.addEventListener('change', handleFormatChange);
        
        // Import file input change
        document.getElementById('importFile')?.addEventListener('change', () => {
            resetImportState();
        });
        
        // Import text area input change
        document.getElementById('importText')?.addEventListener('input', () => {
            resetImportState();
        });
        
        // Initialize format-specific UI elements
        handleFormatChange();
    };
    
    /**
     * Handles format change to update UI elements
     */
    const handleFormatChange = () => {
        const formatSelect = document.getElementById('exportFormat');
        const includeMediaContainer = document.getElementById('includeMediaContainer');
        
        if (formatSelect && includeMediaContainer) {
            // Show media option only for ZIP format
            includeMediaContainer.style.display = formatSelect.value === 'zip' ? 'block' : 'none';
        }
    };
    
    /**
     * Resets the import state when input changes
     */    
    const resetImportState = () => {
        state.importedData = null;
        state.validationResult = null;
        state.importProgress.status = 'idle';
        state.importProgress.message = '';
        
        // Update UI
        const validationResults = document.getElementById('validationResults');
        if (validationResults) {
            validationResults.classList.add('d-none');
        }
        
        // Disable import button
        const importButton = document.getElementById('btnImport');
        if (importButton) {
            importButton.disabled = true;
        }
    };
    
    /**
     * Handles the export to file action
     */
    const handleExportToFile = async () => {
        try {
            // Check if database is connected
            if (!ConciergeData.getDatabase().db) {
                UIManager.showToast('danger', 'Export Error', 'Database is not connected. Please initialize the database first.');
                return;
            }
            
            // Get export options
            const filename = document.getElementById('exportFilename').value.trim() || 'concierge-data-export';
            const format = document.getElementById('exportFormat').value;
            const pretty = document.getElementById('prettyPrint').checked;
            const includeMedia = document.getElementById('includeMedia')?.checked ?? true;
            
            // Set export format and options
            state.exportFormat = format;
            state.exportOptions = {
                pretty,
                includeMedia
            };
            
            // Show loading toast
            UIManager.showToast('info', 'Exporting Data', 'Preparing export data...');
            
            // Perform export
            await ImportExportManager.exportToFile(filename, format, state.exportOptions);
            
            // Show success toast
            UIManager.showToast('success', 'Export Successful', 'Data has been exported successfully.');
        } catch (error) {
            console.error('Export error:', error);
            UIManager.showToast('danger', 'Export Error', `Failed to export data: ${error.message}`);
        }
    };
    
    /**
     * Handles the export to text action
     */
    const handleExportToText = async () => {
        try {
            // Check if database is connected
            if (!ConciergeData.getDatabase().db) {
                UIManager.showToast('danger', 'Export Error', 'Database is not connected. Please initialize the database first.');
                return;
            }
            
            // Get export options
            const format = document.getElementById('exportFormat').value;
            const pretty = document.getElementById('prettyPrint').checked;
            const includeMedia = document.getElementById('includeMedia')?.checked ?? true;
            
            // Set export format and options
            state.exportFormat = format;
            state.exportOptions = {
                pretty,
                includeMedia
            };
            
            // Show loading toast
            UIManager.showToast('info', 'Generating Preview', 'Preparing data preview...');
            
            // Only allow text preview for JSON format, not ZIP
            if (format !== 'json') {
                UIManager.showToast('warning', 'Format Not Supported', 'Text preview is only available for JSON format.');
                return;
            }
            
            // Perform export
            const exportedText = await ImportExportManager.exportToString(format, state.exportOptions);
            
            // Display in modal
            const textArea = document.getElementById('exportTextPreview');
            if (textArea) {
                textArea.value = exportedText;
            }
            
            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('exportTextModal'));
            modal.show();
        } catch (error) {
            console.error('Export error:', error);
            UIManager.showToast('danger', 'Export Error', `Failed to generate export text: ${error.message}`);
        }
    };
    
    /**
     * Handles copying the export text to clipboard
     */
    const handleCopyExport = () => {
        const textArea = document.getElementById('exportTextPreview');
        if (!textArea) return;
        
        try {
            textArea.select();
            document.execCommand('copy');
            
            // Show success toast
            UIManager.showToast('success', 'Copied', 'Export data copied to clipboard.');
        } catch (error) {
            console.error('Copy error:', error);
            UIManager.showToast('danger', 'Copy Error', `Failed to copy text: ${error.message}`);
        }
    };
    
    /**
     * Handles validating import data
     */
    const handleValidateImport = async () => {
        try {
            // Reset previous validation
            resetImportState();
            
            // Update status
            state.importProgress.status = 'validating';
            
            // Get validation results div
            const validationResults = document.getElementById('validationResults');
            const validationContent = document.getElementById('validationContent');
            
            if (!validationResults || !validationContent) return;
            
            // Check which import method is active
            const activeTab = document.querySelector('#importTabs .nav-link.active');
            if (!activeTab) return;
            
            let importData;
            let format = 'json'; // Default format
            
            if (activeTab.id === 'file-tab') {
                // Get file
                const fileInput = document.getElementById('importFile');
                if (!fileInput || !fileInput.files || !fileInput.files[0]) {
                    throw new Error('Please select a file to import.');
                }
                
                const file = fileInput.files[0];
                
                // Determine format from file extension
                if (file.name.toLowerCase().endsWith('.zip')) {
                    format = 'zip';
                    
                    // Check if the ZIP handler is available
                    if (!ImportExportManager.getFormatHandler('zip')) {
                        throw new Error('ZIP format handler is not available. Make sure JSZip library is loaded.');
                    }
                    
                    // For ZIP files, we need to pass the raw file data
                    importData = await readFileAsArrayBuffer(file);
                    
                    // Show specific message for ZIP validation
                    UIManager.showToast('info', 'Validating ZIP Archive', 'Checking for required concierge-data.json file...');
                } else {
                    // For JSON files, read as text
                    importData = await readFileAsText(file);
                }
            } else {
                // Get text (only JSON is supported for text input)
                const textArea = document.getElementById('importText');
                if (!textArea || !textArea.value.trim()) {
                    throw new Error('Please enter import data in the text area.');
                }
                
                importData = textArea.value.trim();
            }
            
            // Get the appropriate handler for the format
            const handler = ImportExportManager.getFormatHandler(format);
            
            if (!handler || typeof handler.validate !== 'function') {
                throw new Error(`No validation handler available for ${format} format.`);
            }
            
            // Validate the data
            const result = await handler.validate(importData);
            
            // Store validation result, imported data, and format
            state.validationResult = result;
            state.importedData = importData;
            state.importFormat = format;
            
            // Show validation results
            validationResults.classList.remove('d-none');
            
            if (result.isValid) {
                validationContent.className = 'alert alert-success';
                validationContent.innerHTML = '<i class="bi bi-check-circle"></i> Data validation successful. You can now import this data.';
                
                // Enable import button
                document.getElementById('btnImport').disabled = false;
            } else {
                validationContent.className = 'alert alert-danger';
                validationContent.innerHTML = `
                    <i class="bi bi-exclamation-triangle"></i> 
                    <strong>Validation Error:</strong> ${result.message || 'The data structure is invalid.'}
                `;
                
                // Keep import button disabled
                document.getElementById('btnImport').disabled = true;
            }
        } catch (error) {
            console.error('Validation error:', error);
            
            // Update UI
            const validationResults = document.getElementById('validationResults');
            const validationContent = document.getElementById('validationContent');
            
            if (validationResults && validationContent) {
                validationResults.classList.remove('d-none');
                validationContent.className = 'alert alert-danger';
                validationContent.innerHTML = `
                    <i class="bi bi-exclamation-triangle"></i> 
                    <strong>Error:</strong> ${error.message}
                `;
            }
            
            // Keep import button disabled
            document.getElementById('btnImport').disabled = true;
        }
    };
    
    /**
     * Handles importing data
     */
    const handleImport = async () => {
        try {
            // Check if we have validated data
            if (!state.importedData || !state.validationResult || !state.validationResult.isValid) {
                throw new Error('Please validate the import data first.');
            }
            
            // Confirm import
            const confirmed = await new Promise(resolve => {
                UIManager.showModal({
                    title: 'Confirm Data Import',
                    content: `
                        <div class="alert alert-warning">
                            <i class="bi bi-exclamation-triangle-fill"></i> 
                            <strong>Warning!</strong> This will overwrite all existing data in the database.
                            <p class="mb-0 mt-2">This action cannot be undone. Are you sure you want to continue?</p>
                        </div>
                    `,
                    buttons: [
                        {
                            text: 'Import Data',
                            type: 'danger',
                            action: () => resolve(true)
                        },
                        {
                            text: 'Cancel',
                            type: 'secondary',
                            action: () => resolve(false)
                        }
                    ]
                });
            });
            
            if (!confirmed) return;
            
            // Update button state
            const importButton = document.getElementById('btnImport');
            if (importButton) {
                importButton.disabled = true;
                importButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Importing...';
            }
            
            // Perform import based on the active tab and format
            const activeTab = document.querySelector('#importTabs .nav-link.active');
            if (activeTab.id === 'file-tab') {
                const fileInput = document.getElementById('importFile');
                if (!fileInput || !fileInput.files || !fileInput.files[0]) {
                    throw new Error('Please select a file to import.');
                }
                
                // If we're importing a ZIP file that's already been validated,
                // we can use the stored data directly
                if (state.importFormat === 'zip') {
                    // Use the handler directly with our stored ArrayBuffer data
                    const data = await ImportExportManager.getFormatHandler('zip').importData(state.importedData);
                    await ConciergeData.data.import(data);
                } else {
                    // Otherwise, use the standard importFromFile method
                    await ImportExportManager.importFromFile(fileInput.files[0]);
                }
            } else {
                // For text input, always use importFromString
                await ImportExportManager.importFromString(state.importedData);
            }
            
            // Show success message
            UIManager.showToast('success', 'Import Successful', 'Data has been imported successfully.');
            
            // Update connection status
            updateConnectionStatus();
            
            // Reset form
            resetImportState();
            document.getElementById('importFile').value = '';
            document.getElementById('importText').value = '';
            
            // Reset button state
            if (importButton) {
                importButton.innerHTML = '<i class="bi bi-upload"></i> Import Data';
            }
        } catch (error) {
            console.error('Import error:', error);
            UIManager.showToast('danger', 'Import Error', `Failed to import data: ${error.message}`);
            
            // Reset button state and other UI elements
            const importButton = document.getElementById('btnImport');
            if (importButton) {
                importButton.disabled = false;
                importButton.innerHTML = '<i class="bi bi-upload"></i> Import Data';
            }
        }
    };
    
    /**
     * Reads a File object as text
     * @param {File} file - The file to read
     * @returns {Promise<string>} Promise resolving with the file contents as string
     */
    const readFileAsText = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Error reading file'));
            reader.readAsText(file);
        });
    };
    
    /**
     * Reads a File object as ArrayBuffer (for binary files like ZIP)
     * @param {File} file - The file to read
     * @returns {Promise<ArrayBuffer>} Promise resolving with the file contents as ArrayBuffer
     */
    const readFileAsArrayBuffer = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Error reading file'));
            reader.readAsArrayBuffer(file);
        });
    };
    
    /**
     * Cleanup when leaving the view
     */
    const onExit = () => {
        // Reset state
        state.importedData = null;
        state.validationResult = null;
        state.importProgress.status = 'idle';
        state.importProgress.message = '';
        state.importFormat = null;
    };
    
    // Public API
    return {
        initialize,
        onExit
    };
})();
