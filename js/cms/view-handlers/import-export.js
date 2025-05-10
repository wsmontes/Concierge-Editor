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
                                    </select>
                                    <div class="form-text">Currently, only JSON format is supported.</div>
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
                            </form>
                        </div>
                        <div class="card-footer">
                            <div class="d-flex justify-content-between">
                                <button id="btnExportToFile" class="btn btn-primary">
                                    <i class="bi bi-download"></i> Export to File
                                </button>
                                
                                <button id="btnExportToText" class="btn btn-outline-secondary">
                                    View as Text
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
                                            <input type="file" class="form-control" id="importFile" accept=".json">
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
        
        // Import file input change
        document.getElementById('importFile')?.addEventListener('change', () => {
            resetImportState();
        });
        
        // Import text area input change
        document.getElementById('importText')?.addEventListener('input', () => {
            resetImportState();
        });
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
            
            // Set export format and options
            state.exportFormat = format;
            state.exportOptions.pretty = pretty;
            
            // Show loading toast
            UIManager.showToast('info', 'Exporting Data', 'Preparing export data...');
            
            // Perform export
            await ImportExportManager.exportToFile(filename, format, { pretty });
            
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
            
            // Set export format and options
            state.exportFormat = format;
            state.exportOptions.pretty = pretty;
            
            // Show loading toast
            UIManager.showToast('info', 'Generating Preview', 'Preparing data preview...');
            
            // Perform export
            const exportedText = await ImportExportManager.exportToString(format, { pretty });
            
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
            
            if (activeTab.id === 'file-tab') {
                // Get file
                const fileInput = document.getElementById('importFile');
                if (!fileInput || !fileInput.files || !fileInput.files[0]) {
                    throw new Error('Please select a file to import.');
                }
                
                // Read file content
                const file = fileInput.files[0];
                const text = await readFileAsText(file);
                
                // Store text for later
                importData = text;
            } else {
                // Get text
                const textArea = document.getElementById('importText');
                if (!textArea || !textArea.value.trim()) {
                    throw new Error('Please enter import data in the text area.');
                }
                
                importData = textArea.value.trim();
            }
            
            // Call import manager to validate
            const format = 'json'; // Currently only JSON is supported
            const handler = ImportExportManager.getFormatHandler(format);
            
            if (!handler || typeof handler.validate !== 'function') {
                throw new Error(`No validation handler available for ${format} format.`);
            }
            
            // Validate the data
            const result = await handler.validate(importData);
            
            // Store validation result and imported data
            state.validationResult = result;
            state.importedData = importData;
            
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
            
            // Perform import
            if (activeTab.id === 'file-tab') {
                const fileInput = document.getElementById('importFile');
                if (!fileInput || !fileInput.files || !fileInput.files[0]) {
                    throw new Error('Please select a file to import.');
                }
                
                await ImportExportManager.importFromFile(fileInput.files[0]);
            } else {
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
            
            // Reset button state
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
     * Cleanup when leaving the view
     */
    const onExit = () => {
        // Reset state
        state.importedData = null;
        state.validationResult = null;
        state.importProgress.status = 'idle';
        state.importProgress.message = '';
    };
    
    // Public API
    return {
        initialize,
        onExit
    };
})();
