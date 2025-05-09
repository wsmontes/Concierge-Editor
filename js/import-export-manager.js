/**
 * import-export-manager.js
 * 
 * Purpose: Manages data import and export operations with format-specific adapters.
 * Coordinates between UI, format handlers, and the data layer for seamless data transfer.
 * 
 * Dependencies: 
 *   - concierge-data.js - For database operations and model coordination
 *   - Format handler modules (e.g., json-format-handler.js) - Must be loaded separately
 */

const ImportExportManager = (() => {
  // Registry of format handlers
  const formatHandlers = {};
  
  // Default format if none specified
  const DEFAULT_FORMAT = 'json';
  
  /**
   * Registers a format handler for import/export operations
   * @param {string} format - Identifier for the format (e.g., 'json', 'csv')
   * @param {Object} handler - Handler object with import/export methods
   */
  const registerFormatHandler = (format, handler) => {
    if (!format || typeof format !== 'string') {
      throw new Error('Format identifier must be a non-empty string');
    }
    
    if (!handler || typeof handler !== 'object') {
      throw new Error('Handler must be an object');
    }
    
    // Validate handler has required methods
    const requiredMethods = ['formatName', 'fileExtension', 'mimeType'];
    const requiredFunctions = ['importData', 'exportData'];
    
    for (const prop of requiredMethods) {
      if (!handler[prop]) {
        throw new Error(`Handler missing required property: ${prop}`);
      }
    }
    
    for (const func of requiredFunctions) {
      if (typeof handler[func] !== 'function') {
        throw new Error(`Handler missing required function: ${func}`);
      }
    }
    
    // Store the handler
    formatHandlers[format.toLowerCase()] = handler;
    console.log(`Registered ${handler.formatName} format handler`);
  };

  /**
   * Gets a registered format handler
   * @param {string} format - Format identifier
   * @returns {Object} The registered handler or null if not found
   */
  const getFormatHandler = (format = DEFAULT_FORMAT) => {
    const handler = formatHandlers[format.toLowerCase()];
    if (!handler) {
      console.error(`No handler registered for format: ${format}`);
      return null;
    }
    return handler;
  };

  /**
   * Gets all registered format handlers
   * @returns {Array} Array of format handler information objects
   */
  const getAvailableFormats = () => {
    return Object.values(formatHandlers).map(handler => ({
      id: handler.formatName.toLowerCase(),
      name: handler.formatName,
      extension: handler.fileExtension,
      mimeType: handler.mimeType
    }));
  };
  
  /**
   * Imports data from the given data string using the specified format handler
   * @param {string} dataString - The data string to import
   * @param {string} format - Format identifier (e.g., 'json', 'csv')
   * @param {Object} options - Additional options for the import operation
   * @returns {Promise<Object>} The imported data object
   */
  const importFromString = async (dataString, format = DEFAULT_FORMAT, options = {}) => {
    const handler = getFormatHandler(format);
    if (!handler) {
      throw new Error(`Unsupported format: ${format}`);
    }
    
    try {
      // Parse the data string using the format handler
      const parsedData = await handler.importData(dataString, options);
      
      // Import the data into the database
      if (window.ConciergeData) {
        await window.ConciergeData.data.import(parsedData);
        return parsedData;
      } else {
        throw new Error('ConciergeData not found');
      }
    } catch (error) {
      console.error('Import error:', error);
      throw error;
    }
  };
  
  /**
   * Exports data to a string in the specified format
   * @param {string} format - Format identifier (e.g., 'json', 'csv')
   * @param {Object} options - Additional options for the export operation
   * @returns {Promise<string>} The exported data string
   */
  const exportToString = async (format = DEFAULT_FORMAT, options = {}) => {
    const handler = getFormatHandler(format);
    if (!handler) {
      throw new Error(`Unsupported format: ${format}`);
    }
    
    try {
      // Get all data from the database
      let data = {};
      if (window.ConciergeData) {
        data = await window.ConciergeData.data.export();
      } else {
        throw new Error('ConciergeData not found');
      }
      
      // Convert the data to the desired format
      return await handler.exportData(data, options);
    } catch (error) {
      console.error('Export error:', error);
      throw error;
    }
  };
  
  /**
   * Imports data from a file
   * @param {File} file - File object to import
   * @param {Object} options - Additional options for the import operation
   * @returns {Promise<Object>} The imported data object
   */
  const importFromFile = (file, options = {}) => {
    return new Promise((resolve, reject) => {
      if (!file || !(file instanceof File)) {
        reject(new Error('Invalid file object'));
        return;
      }
      
      // Determine format from file extension
      const fileExt = file.name.split('.').pop().toLowerCase();
      const format = Object.keys(formatHandlers).find(
        key => formatHandlers[key].fileExtension.replace('.', '') === fileExt
      ) || DEFAULT_FORMAT;
      
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          const dataString = event.target.result;
          const result = await importFromString(dataString, format, options);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Error reading file'));
      };
      
      reader.readAsText(file);
    });
  };
  
  /**
   * Exports data to a file download
   * @param {string} filename - Name for the exported file (without extension)
   * @param {string} format - Format identifier (e.g., 'json', 'csv')
   * @param {Object} options - Additional options for the export operation
   * @returns {Promise<void>} Resolves when the download starts
   */
  const exportToFile = async (filename = 'export', format = DEFAULT_FORMAT, options = {}) => {
    const handler = getFormatHandler(format);
    if (!handler) {
      throw new Error(`Unsupported format: ${format}`);
    }
    
    try {
      // Export data to string in the desired format
      const dataString = await exportToString(format, options);
      
      // Create a Blob with the data
      const blob = new Blob([dataString], { type: handler.mimeType });
      
      // Create a URL for the Blob
      const url = URL.createObjectURL(blob);
      
      // Create a download link and trigger it
      const link = document.createElement('a');
      link.href = url;
      link.download = filename + handler.fileExtension;
      link.click();
      
      // Clean up the URL object
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (error) {
      console.error('Export to file error:', error);
      throw error;
    }
  };

  /**
   * Format validation utility
   * @param {string} dataString - The data string to validate
   * @param {string} format - Format identifier to validate against
   * @returns {Object} Validation result with isValid flag and message
   */
  const validateFormat = (dataString, format = DEFAULT_FORMAT) => {
    const handler = getFormatHandler(format);
    if (!handler || !handler.validate) {
      return { isValid: false, message: `No validator available for ${format} format` };
    }
    
    try {
      return handler.validate(dataString);
    } catch (error) {
      return { isValid: false, message: error.message };
    }
  };

  // Public API
  return {
    registerFormatHandler,
    getFormatHandler,
    getAvailableFormats,
    importFromString,
    exportToString,
    importFromFile,
    exportToFile,
    validateFormat
  };
})();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ImportExportManager;
} else {
  window.ImportExportManager = ImportExportManager;
}
