/**
 * zip-format-handler.js
 * 
 * Purpose: Provides ZIP import/export functionality with structured content.
 * Creates and extracts ZIP archives with a specific folder structure containing
 * JSON data at the root and media files in dedicated folders.
 * 
 * Dependencies:
 *   - import-export-manager.js - Integrates with ImportExportManager
 *   - JSZip - External library for ZIP file handling
 */

const ZipFormatHandler = (() => {
  // Configuration
  const CONFIG = {
    dataFileName: 'data.json',  // Default filename to look for
    imagesFolderName: 'images',
    mediaFolderName: 'media'
  };
  
  /**
   * Checks if JSZip library is available
   * @returns {boolean} True if JSZip is loaded
   */
  const isJSZipAvailable = () => {
    return typeof JSZip === 'function';
  };

  /**
   * Extracts image URLs from data
   * @param {Object} data - The data object to analyze
   * @returns {Array} Array of image URLs found in the data
   */
  const extractImageUrls = (data) => {
    const imageUrls = new Set();
    
    // Extract URLs from photos collection
    if (data.photos && Array.isArray(data.photos)) {
      data.photos.forEach(photo => {
        if (photo.url && typeof photo.url === 'string') {
          imageUrls.add(photo.url);
        }
      });
    }
    
    // Extract URLs from restaurants
    if (data.restaurants && Array.isArray(data.restaurants)) {
      data.restaurants.forEach(restaurant => {
        // Restaurant cover images or logos
        if (restaurant.coverImage && typeof restaurant.coverImage === 'string') {
          imageUrls.add(restaurant.coverImage);
        }
        if (restaurant.logo && typeof restaurant.logo === 'string') {
          imageUrls.add(restaurant.logo);
        }
        
        // Menu item images
        if (restaurant.menu && Array.isArray(restaurant.menu)) {
          restaurant.menu.forEach(item => {
            if (item.image && typeof item.image === 'string') {
              imageUrls.add(item.image);
            }
          });
        }
      });
    }
    
    return [...imageUrls];
  };
  
  /**
   * Extracts media URLs (audio, video) from data
   * @param {Object} data - The data object to analyze
   * @returns {Array} Array of media URLs found in the data
   */
  const extractMediaUrls = (data) => {
    const mediaUrls = new Set();
    
    // Extract audio URLs
    if (data.transcripts && Array.isArray(data.transcripts)) {
      data.transcripts.forEach(transcript => {
        if (transcript.audioSource && typeof transcript.audioSource === 'string') {
          mediaUrls.add(transcript.audioSource);
        }
      });
    }
    
    // Extract other media (videos, etc.)
    if (data.media && Array.isArray(data.media)) {
      data.media.forEach(item => {
        if (item.url && typeof item.url === 'string') {
          mediaUrls.add(item.url);
        }
      });
    }
    
    return [...mediaUrls];
  };

  /**
   * Fetches an external file as ArrayBuffer
   * @param {string} url - URL of the file to fetch
   * @returns {Promise<ArrayBuffer>} The file content as ArrayBuffer
   */
  const fetchFileAsArrayBuffer = async (url) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${url} (${response.status})`);
      }
      return await response.arrayBuffer();
    } catch (error) {
      console.warn(`Could not fetch file from ${url}:`, error);
      return null;
    }
  };

  /**
   * Gets the filename from a URL
   * @param {string} url - URL to extract filename from
   * @returns {string} The extracted filename
   */
  const getFilenameFromUrl = (url) => {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      return pathname.split('/').pop() || `file-${Math.random().toString(36).substring(2, 10)}`;
    } catch (e) {
      // If URL parsing fails, extract the last path component
      const parts = url.split('/');
      return parts.pop() || `file-${Math.random().toString(36).substring(2, 10)}`;
    }
  };

  /**
   * Finds and returns the first valid JSON file in a ZIP archive
   * @param {JSZip} zip - JSZip instance with loaded zip content
   * @returns {Promise<{file: Object, content: string}>} The file object and its content
   */
  const findJsonFileInZip = async (zip) => {
    // First try the default filename
    let dataFile = zip.file(CONFIG.dataFileName);
    
    // If not found, look for any .json file at the root level
    if (!dataFile) {
      const rootFiles = Object.keys(zip.files)
        .filter(path => !path.includes('/') && path.toLowerCase().endsWith('.json'))
        .map(path => zip.file(path))
        .filter(file => file !== null);
        
      if (rootFiles.length > 0) {
        // Use the first JSON file found
        dataFile = rootFiles[0];
        
        // If there are multiple JSON files, try to find one that contains valid data
        if (rootFiles.length > 1) {
          console.log(`Multiple JSON files found in ZIP archive, checking each one for valid data`);
          
          for (const file of rootFiles) {
            try {
              const content = await file.async('string');
              const data = JSON.parse(content);
              
              // Basic check: if it has any of our expected data structures, use this file
              if (data && (
                Array.isArray(data.restaurants) || 
                Array.isArray(data.curators) || 
                Array.isArray(data.photos) || 
                Array.isArray(data.locations)
              )) {
                dataFile = file;
                console.log(`Selected ${file.name} as it contains recognizable data structures`);
                break;
              }
            } catch (e) {
              // Continue to the next file if this one has invalid JSON
              console.warn(`Error parsing ${file.name}: ${e.message}`);
            }
          }
        }
      }
    }
    
    if (!dataFile) {
      throw new Error('No JSON file found in ZIP archive');
    }
    
    const content = await dataFile.async('string');
    return { file: dataFile, content };
  };

  // Format handler definition
  const handler = {
    formatName: 'ZIP Archive',
    fileExtension: '.zip',
    mimeType: 'application/zip',
    
    /**
     * Imports data from ZIP file content
     * @param {ArrayBuffer} zipData - ZIP file content as ArrayBuffer
     * @param {Object} options - Import options
     * @returns {Promise<Object>} - The parsed data
     */
    importData: async (zipData, options = {}) => {
      if (!isJSZipAvailable()) {
        throw new Error('JSZip library not available. Cannot import ZIP file.');
      }
      
      try {
        const zip = await JSZip.loadAsync(zipData);
        
        // Find any suitable JSON file in the ZIP
        const { content } = await findJsonFileInZip(zip);
        
        // Parse the JSON content
        return JSON.parse(content);
      } catch (error) {
        if (error.message.includes('JSON')) {
          throw new Error(`Invalid JSON data in ZIP file: ${error.message}`);
        } else {
          throw new Error(`Failed to process ZIP file: ${error.message}`);
        }
      }
    },
    
    /**
     * Exports data to a ZIP file
     * @param {Object} data - The data to export
     * @param {Object} options - Export options
     * @returns {Promise<ArrayBuffer>} - The generated ZIP file content
     */
    exportData: async (data, options = {}) => {
      if (!isJSZipAvailable()) {
        throw new Error('JSZip library not available. Cannot create ZIP file.');
      }
      
      try {
        const zip = new JSZip();
        
        // Add the data as JSON file in the root
        const jsonData = JSON.stringify(data, null, options.pretty ? 2 : 0);
        zip.file(CONFIG.dataFileName, jsonData);
        
        // Extract image URLs from data
        const imageUrls = extractImageUrls(data);
        
        // Fetch and add images to the 'images' folder
        for (const url of imageUrls) {
          const imageData = await fetchFileAsArrayBuffer(url);
          if (imageData) {
            const filename = getFilenameFromUrl(url);
            zip.folder(CONFIG.imagesFolderName).file(filename, imageData);
          }
        }
        
        // Extract and add media files if requested
        if (options.includeMedia !== false) {
          const mediaUrls = extractMediaUrls(data);
          
          for (const url of mediaUrls) {
            const mediaData = await fetchFileAsArrayBuffer(url);
            if (mediaData) {
              const filename = getFilenameFromUrl(url);
              zip.folder(CONFIG.mediaFolderName).file(filename, mediaData);
            }
          }
        }
        
        // Generate ZIP file content
        return await zip.generateAsync({
          type: 'arraybuffer',
          compression: 'DEFLATE',
          compressionOptions: {
            level: 9
          }
        });
      } catch (error) {
        throw new Error(`Failed to create ZIP file: ${error.message}`);
      }
    },
    
    /**
     * Validates a ZIP file
     * @param {ArrayBuffer|string} zipData - ZIP data as ArrayBuffer or base64 string
     * @returns {Object} Validation result with isValid flag and message
     */
    validate: async (zipData) => {
      if (!isJSZipAvailable()) {
        return { 
          isValid: false, 
          message: 'JSZip library not available. Cannot validate ZIP file.' 
        };
      }
      
      try {
        // Convert string data to ArrayBuffer if needed
        let dataBuffer = zipData;
        if (typeof zipData === 'string') {
          // Try to decode base64
          try {
            dataBuffer = Uint8Array.from(atob(zipData), c => c.charCodeAt(0)).buffer;
          } catch (e) {
            return {
              isValid: false,
              message: 'Invalid data format. Expected ZIP file content.'
            };
          }
        }
        
        // Try to load the zip file
        const zip = await JSZip.loadAsync(dataBuffer);
        
        // Try to find any JSON file and parse it
        try {
          const { file, content } = await findJsonFileInZip(zip);
          JSON.parse(content); // Will throw if invalid JSON
          
          // All checks passed
          return {
            isValid: true,
            message: `ZIP file structure is valid. Using JSON file: ${file.name}`
          };
        } catch (jsonError) {
          return {
            isValid: false,
            message: `No valid JSON data found in ZIP archive: ${jsonError.message}`
          };
        }
      } catch (error) {
        return {
          isValid: false,
          message: `Invalid ZIP file: ${error.message}`
        };
      }
    }
  };

  // Register this handler with ImportExportManager if available
  if (window.ImportExportManager) {
    window.ImportExportManager.registerFormatHandler('zip', handler);
    console.log('ZIP format handler registered with ImportExportManager');
  } else {
    console.warn('ImportExportManager not found. ZIP format handler not registered.');
  }

  return handler;
})();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ZipFormatHandler;
} else {
  window.ZipFormatHandler = ZipFormatHandler;
}
