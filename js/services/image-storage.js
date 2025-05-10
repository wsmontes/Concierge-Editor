/**
 * image-storage.js
 * 
 * Purpose: Provides functionality for storing and retrieving images from IndexedDB.
 * Handles binary image data stored directly in the database without requiring URLs.
 * 
 * Dependencies:
 *   - None, uses native IndexedDB API
 */

const ImageStorage = (() => {
    // Constants
    const DB_NAME = 'concierge_images';
    const DB_VERSION = 1;
    const STORE_NAME = 'images';
    
    // Database reference
    let db = null;
    let dbInitialized = false;
    
    // Path lookup cache for performance
    const pathLookupCache = new Map();
    
    // Default placeholder SVG for missing images
    const PLACEHOLDER_IMAGE = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22200%22%20height%3D%22150%22%3E%3Crect%20width%3D%22200%22%20height%3D%22150%22%20fill%3D%22%23EEEEEE%22%2F%3E%3Ctext%20x%3D%22100%22%20y%3D%2275%22%20font-family%3D%22Arial%22%20font-size%3D%2214%22%20text-anchor%3D%22middle%22%20alignment-baseline%3D%22middle%22%20fill%3D%22%23999999%22%3EImage%20not%20available%3C%2Ftext%3E%3C%2Fsvg%3E';
    
    // Track initialization state
    let isRegisteredWithConciergeData = false;
    
    /**
     * Initialize the database
     * @returns {Promise} - Resolves when database is ready
     */
    const initialize = () => {
        return new Promise((resolve, reject) => {
            if (dbInitialized && db) {
                resolve(db);
                return;
            }
            
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            
            request.onerror = (event) => {
                console.error('Failed to open IndexedDB:', event.target.error);
                reject(new Error('Failed to open IndexedDB'));
            };
            
            request.onsuccess = (event) => {
                db = event.target.result;
                dbInitialized = true;
                
                // Ensure we're registered with ConciergeData
                registerWithConciergeData();
                
                resolve(db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object store for images
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                    store.createIndex('by_path', 'path', { unique: true });
                    console.log('Created images object store');
                }
            };
        });
    };
    
    /**
     * Register this service with ConciergeData
     * @private
     */
    const registerWithConciergeData = () => {
        if (isRegisteredWithConciergeData) return;
        
        if (window.ConciergeData && typeof window.ConciergeData.registerModel === 'function') {
            console.log('Registering ImageStorage with ConciergeData');
            window.ConciergeData.registerModel('imageStorage', {
                initialize,
                onDataImported
            });
            isRegisteredWithConciergeData = true;
        }
    };
    
    /**
     * Store an image in IndexedDB
     * @param {string} id - Unique identifier for the image
     * @param {string} path - Original path/reference of the image
     * @param {string|Blob} imageData - Image data as base64 string or Blob
     * @returns {Promise<string>} - Resolves with the stored image ID
     */
    const storeImage = async (id, path, imageData) => {
        try {
            await initialize();
            
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                
                const processImageData = (data) => {
                    const imageRecord = {
                        id: id, 
                        path: path,
                        data: data,
                        timestamp: new Date().toISOString()
                    };
                    
                    const request = store.put(imageRecord);
                    
                    request.onsuccess = () => {
                        // Clear path lookup cache when we add/update an image
                        pathLookupCache.delete(path);
                        resolve(id);
                    };
                    
                    request.onerror = (event) => {
                        reject(new Error(`Failed to store image: ${event.target.error}`));
                    };
                };
                
                // Handle different input types
                if (typeof imageData === 'string') {
                    // If already a string, use directly
                    processImageData(imageData);
                } else if (imageData instanceof Blob) {
                    // Convert blob to binary string
                    const reader = new FileReader();
                    reader.readAsBinaryString(imageData);
                    
                    reader.onload = () => processImageData(reader.result);
                    reader.onerror = () => reject(new Error('Failed to read image data'));
                } else {
                    reject(new Error('Invalid image data format'));
                }
            });
        } catch (error) {
            console.error('Error storing image:', error);
            throw error;
        }
    };
    
    /**
     * Generate path variations for a given path to improve lookup success
     * @private
     * @param {string} path - The original path
     * @returns {Array<string>} - Array of path variations
     */
    const generatePathVariations = (path) => {
        if (!path) return [];
        
        const variations = new Set([path]); // Use Set to avoid duplicates
        
        // Try with/without leading slash
        if (path.startsWith('/')) {
            variations.add(path.substring(1));
        } else {
            variations.add('/' + path);
        }
        
        // Handle URL paths
        try {
            // If it's a URL, add variations without protocol and domain
            if (path.startsWith('http')) {
                const url = new URL(path);
                variations.add(url.pathname);
                variations.add(url.pathname.substring(1));
                
                // Add filename only
                const filename = url.pathname.split('/').pop();
                if (filename) {
                    variations.add(filename);
                }
                
                // Add variations with different domain/protocol combinations
                if (path.startsWith('https://')) {
                    variations.add(path.replace('https://', 'http://'));
                } else if (path.startsWith('http://')) {
                    variations.add(path.replace('http://', 'https://'));
                }
                
                // Add without www if present
                if (url.hostname.startsWith('www.')) {
                    const noWwwHostname = url.hostname.substring(4);
                    const noWwwUrl = new URL(url);
                    noWwwUrl.hostname = noWwwHostname;
                    variations.add(noWwwUrl.toString());
                }
            }
        } catch (e) {
            // Not a valid URL, that's fine
        }
        
        // For path-like strings, add filename only variation
        if (path.includes('/')) {
            const filename = path.split('/').pop();
            if (filename) {
                variations.add(filename);
            }
        }
        
        // Add lower/uppercase variations for filenames
        const pathLower = path.toLowerCase();
        if (pathLower !== path) {
            variations.add(pathLower);
        }
        
        return [...variations]; // Convert back to array
    };
    
    /**
     * Get an image from IndexedDB by ID or path, trying various path variations
     * @param {string} idOrPath - ID or path of the image to retrieve
     * @returns {Promise<string>} - Resolves with the image Data URL or null if not found
     */
    const getImage = async (idOrPath) => {
        if (!idOrPath) return null;
        
        try {
            await initialize();
            
            // Check cache first
            if (pathLookupCache.has(idOrPath)) {
                return pathLookupCache.get(idOrPath);
            }
            
            // First try by ID
            let image = await getImageById(idOrPath);
            
            // If not found, try by path
            if (!image) {
                image = await getImageByPath(idOrPath);
                
                // If still not found, try path variations
                if (!image) {
                    const variations = generatePathVariations(idOrPath);
                    for (const variant of variations) {
                        if (variant !== idOrPath) {  // Skip the original path we already tried
                            image = await getImageByPath(variant);
                            if (image) {
                                // Remember this path mapping for future lookups
                                pathLookupCache.set(idOrPath, image);
                                break;
                            }
                        }
                    }
                }
            }
            
            if (image && image.data) {
                // Convert binary string to base64 for display if needed
                let dataUrl;
                
                if (image.data.startsWith('data:')) {
                    // Already a data URL
                    dataUrl = image.data;
                } else {
                    // Convert to data URL
                    try {
                        dataUrl = 'data:image/jpeg;base64,' + btoa(image.data);
                    } catch (e) {
                        // If btoa fails, the data might already be base64 encoded
                        dataUrl = 'data:image/jpeg;base64,' + image.data;
                    }
                }
                
                // Cache the result
                pathLookupCache.set(idOrPath, dataUrl);
                return dataUrl;
            }
            
            // No image found
            pathLookupCache.set(idOrPath, null);
            return null;
        } catch (error) {
            console.error('Error getting image:', error);
            return null;
        }
    };
    
    /**
     * Get an image by ID
     * @private
     * @param {string} id - ID of the image
     * @returns {Promise<Object>} - Image record or null
     */
    const getImageById = (id) => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(id);
            
            request.onsuccess = (event) => {
                resolve(event.target.result || null);
            };
            
            request.onerror = (event) => {
                reject(new Error(`Error retrieving image: ${event.target.error}`));
            };
        });
    };
    
    /**
     * Get an image by path
     * @private
     * @param {string} path - Path of the image
     * @returns {Promise<Object>} - Image record or null
     */
    const getImageByPath = (path) => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const index = store.index('by_path');
            const request = index.get(path);
            
            request.onsuccess = (event) => {
                resolve(event.target.result || null);
            };
            
            request.onerror = (event) => {
                reject(new Error(`Error retrieving image by path: ${event.target.error}`));
            };
        });
    };
    
    /**
     * Load and retrieve an image from database - NO URL FETCHING
     * @param {string} path - Path/ID of the image to retrieve
     * @returns {Promise<string>} - Resolves with Data URL of the cached image or placeholder
     */
    const loadAndCacheImage = async (path) => {
        try {
            // Get from database only - no URL fetching
            const cachedImage = await getImage(path);
            if (cachedImage) return cachedImage;
            
            // Database lookup failed, log and return placeholder
            console.log(`Image not found in database: ${path}, returning placeholder`);
            return PLACEHOLDER_IMAGE;
        } catch (error) {
            console.error('Error accessing image database:', error);
            return PLACEHOLDER_IMAGE;
        }
    };
    
    /**
     * Delete all images from storage
     * @returns {Promise} - Resolves when all images are deleted
     */
    const clearAllImages = async () => {
        try {
            await initialize();
            
            // Also clear the path lookup cache
            pathLookupCache.clear();
            
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.clear();
                
                request.onsuccess = () => {
                    resolve();
                };
                
                request.onerror = (event) => {
                    reject(new Error(`Failed to clear images: ${event.target.error}`));
                };
            });
        } catch (error) {
            console.error('Error clearing images:', error);
            throw error;
        }
    };
    
    /**
     * Store a data URL as an image in the database
     * @param {string} path - Path or ID for the image
     * @param {string} dataUrl - Data URL of the image
     * @returns {Promise<string>} - The ID of the stored image
     */
    const storeDataUrl = async (path, dataUrl) => {
        if (!dataUrl || !path) return null;
        
        const id = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await storeImage(id, path, dataUrl);
        return id;
    };
    
    /**
     * Extract filename from a path or URL
     * @private
     * @param {string} path - Path to extract filename from
     * @returns {string|null} - Filename or null if couldn't extract
     */
    const extractFilenameFromPath = (path) => {
        if (!path) return null;
        
        try {
            // First try to handle as URL
            if (path.startsWith('http')) {
                try {
                    const url = new URL(path);
                    const segments = url.pathname.split('/');
                    return segments[segments.length - 1] || null;
                } catch (e) {
                    // Not a valid URL, continue with regular path handling
                }
            }
            
            // Handle as regular path
            const segments = path.split('/');
            return segments[segments.length - 1] || null;
        } catch (e) {
            console.error('Error extracting filename:', e);
            return null;
        }
    };
    
    /**
     * Check if image exists in database
     * @param {string} path - Path/ID to check
     * @returns {Promise<boolean>} - Whether image exists in database
     */
    const checkImageExistence = async (path) => {
        const image = await getImage(path);
        return !!image;
    };
    
    /**
     * Process photo imports in batches to prevent transaction timeouts
     * @private
     * @param {Array} photos - Array of photo objects
     * @param {number} batchSize - Number of photos per batch
     * @param {boolean} replaceExisting - Whether to replace existing images
     * @returns {Promise<number>} - Number of imported photos
     */
    const processPhotoImportBatches = async (photos, batchSize = 10, replaceExisting = true) => {
        let totalImported = 0;
        let alreadyExisting = 0;
        
        // Calculate batches
        const batches = Math.ceil(photos.length / batchSize);
        
        for (let i = 0; i < batches; i++) {
            const start = i * batchSize;
            const end = Math.min(start + batchSize, photos.length);
            const batchPhotos = photos.slice(start, end);
            
            console.log(`Processing batch ${i+1}/${batches} (${batchPhotos.length} photos)`);
            
            // Process each photo in batch
            for (const photo of batchPhotos) {
                if (photo.photoDataRef) {
                    // Check if this exact path already exists
                    const exactPathExists = await getImageByPath(photo.photoDataRef);
                    
                    if (exactPathExists && !replaceExisting) {
                        // Skip if we're not replacing existing images
                        alreadyExisting++;
                        continue;
                    }
                    
                    // Check variations only if we're not replacing everything
                    let exists = false;
                    if (!replaceExisting) {
                        const pathVariations = generatePathVariations(photo.photoDataRef);
                        
                        for (const variant of pathVariations) {
                            if (variant !== photo.photoDataRef) {
                                const existing = await getImageByPath(variant);
                                if (existing) {
                                    exists = true;
                                    alreadyExisting++;
                                    break;
                                }
                            }
                        }
                    }
                    
                    // If the image doesn't exist or we're replacing it
                    if (!exists || replaceExisting) {
                        // If the path has a filename pattern, also store a simplified version
                        const filename = extractFilenameFromPath(photo.photoDataRef);
                        
                        // Store the original path
                        await storeDataUrl(photo.photoDataRef, PLACEHOLDER_IMAGE);
                        totalImported++;
                        
                        // If we have an extracted filename different from the path, store it too
                        if (filename && filename !== photo.photoDataRef) {
                            await storeDataUrl(filename, PLACEHOLDER_IMAGE);
                        }
                    }
                }
            }
        }
        
        console.log(`ImageStorage import: ${totalImported} new references registered, ${alreadyExisting} already existed but ${replaceExisting ? 'were replaced' : 'were preserved'}`);
        return totalImported;
    };
    
    /**
     * Handle data import event - register any images that come in from data import
     * @param {Object} data - The imported data
     * @returns {Promise<number>} - Number of imported images
     */
    const onDataImported = async (data) => {
        console.log('ImageStorage processing imported data');
        
        try {
            await initialize();
            let importCount = 0;
            
            // Always clear the existing image store on import to ensure fresh data
            console.log('Clearing existing image database before import');
            await clearAllImages();
            
            // Process photoDataRef from restaurantPhotos
            if (data && data.restaurantPhotos && Array.isArray(data.restaurantPhotos)) {
                console.log(`Found ${data.restaurantPhotos.length} photo references in import`);
                
                // Process photos in batches to avoid transaction timeouts
                // We're now forcing replacement of any existing images
                importCount = await processPhotoImportBatches(data.restaurantPhotos, 10, true);
            } else {
                console.log('No restaurantPhotos data found in import');
            }
            
            // Also look for any embedded images in the import data (e.g., from a ZIP file)
            if (data && data._embedded && data._embedded.images && typeof data._embedded.images === 'object') {
                const embeddedImages = data._embedded.images;
                const imageKeys = Object.keys(embeddedImages);
                
                console.log(`Found ${imageKeys.length} embedded images in import`);
                let embeddedCount = 0;
                
                for (const key of imageKeys) {
                    if (embeddedImages[key] && embeddedImages[key].startsWith('data:')) {
                        await storeDataUrl(key, embeddedImages[key]);
                        embeddedCount++;
                    }
                }
                
                console.log(`ImageStorage imported ${embeddedCount} embedded images`);
                importCount += embeddedCount;
            }
            
            return importCount;
        } catch (error) {
            console.error('Error processing imported images:', error);
            return 0;
        }
    };
    
    // Register with ConciergeData 
    registerWithConciergeData();
    
    // Public API
    return {
        initialize,
        storeImage,
        getImage,
        loadAndCacheImage,
        clearAllImages,
        checkImageExistence,
        storeDataUrl,
        getPlaceholder: () => PLACEHOLDER_IMAGE,
        onDataImported
    };
})();

// Make available globally
window.ImageStorage = ImageStorage;
