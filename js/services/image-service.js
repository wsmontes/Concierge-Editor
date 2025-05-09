/**
 * Image Service - Handles image data operations
 * Dependencies: BaseService, StorageModule
 * Provides comprehensive image management functionality
 */

class ImageService extends BaseService {
    /**
     * Initialize the image service
     */
    constructor() {
        super(StorageModule.STORES.IMAGES);
        
        // Additional stores used by this service
        this.photosStore = StorageModule.STORES.PHOTOS;
    }
    
    /**
     * Save an image with metadata
     * @param {Object} imageData - Image data and metadata
     * @param {Blob|string} imageData.data - Image binary data or base64
     * @param {string|number} imageData.restaurantId - Associated restaurant ID
     * @param {string} [imageData.type] - Image type/category
     * @return {Promise<Object>} - Promise with saved image reference
     */
    async saveImage(imageData) {
        if (!imageData || !imageData.data) {
            throw new Error('Image data is required');
        }
        
        if (!imageData.restaurantId) {
            throw new Error('Restaurant ID is required');
        }
        
        try {
            // Generate ID if not provided
            const id = imageData.id || Date.now();
            
            // Save image data
            await StorageModule.saveItem(this.storeName, {
                id,
                data: imageData.data,
                timestamp: new Date().toISOString()
            });
            
            // Create photo reference
            const photoRef = {
                id,
                restaurantId: imageData.restaurantId,
                photoDataRef: id.toString(),
                timestamp: new Date().toISOString(),
                type: imageData.type || 'general'
            };
            
            await StorageModule.saveItem(this.photosStore, photoRef);
            
            return photoRef;
        } catch (error) {
            console.error('Error saving image:', error);
            throw new Error(`Failed to save image: ${error.message}`);
        }
    }
    
    /**
     * Get images for a specific restaurant
     * @param {string|number} restaurantId - Restaurant ID
     * @return {Promise<Array>} - Promise with restaurant's images
     */
    async getRestaurantImages(restaurantId) {
        try {
            // Get photo references for this restaurant
            const photoRefs = await StorageModule.getItemsByIndex(
                this.photosStore, 'restaurantId', restaurantId
            );
            
            if (photoRefs.length === 0) {
                return [];
            }
            
            // Get actual image data for each photo
            const images = await Promise.all(photoRefs.map(async (photoRef) => {
                try {
                    const imageData = await StorageModule.getItem(this.storeName, photoRef.id);
                    
                    return {
                        ...photoRef,
                        url: imageData ? await this.getImageUrl(photoRef.id) : null,
                        hasData: !!imageData
                    };
                } catch (error) {
                    console.warn(`Error loading image ${photoRef.id}:`, error);
                    
                    return {
                        ...photoRef,
                        url: null,
                        hasData: false,
                        error: error.message
                    };
                }
            }));
            
            return images;
        } catch (error) {
            console.error(`Error getting images for restaurant ${restaurantId}:`, error);
            throw new Error(`Failed to get restaurant images: ${error.message}`);
        }
    }
    
    /**
     * Get URL for an image
     * @param {string|number} imageId - Image ID
     * @return {Promise<string>} - Promise with image URL
     */
    async getImageUrl(imageId) {
        try {
            const image = await StorageModule.getItem(this.storeName, imageId);
            
            if (!image || !image.data) {
                return null;
            }
            
            // Handle different data formats
            if (typeof image.data === 'string' && image.data.startsWith('data:')) {
                // Already a data URL
                return image.data;
            }
            
            // Create object URL for Blob or ArrayBuffer
            let blob;
            if (image.data instanceof Blob) {
                blob = image.data;
            } else if (image.data instanceof ArrayBuffer) {
                blob = new Blob([image.data]);
            } else {
                throw new Error('Unsupported image data format');
            }
            
            return URL.createObjectURL(blob);
        } catch (error) {
            console.error(`Error getting URL for image ${imageId}:`, error);
            throw new Error(`Failed to get image URL: ${error.message}`);
        }
    }
    
    /**
     * Delete an image and its reference
     * @param {string|number} imageId - Image ID
     * @return {Promise<boolean>} - Promise resolving to true if successful
     */
    async deleteImage(imageId) {
        try {
            // Delete photo reference
            await StorageModule.deleteItem(this.photosStore, imageId);
            
            // Delete actual image data
            await StorageModule.deleteItem(this.storeName, imageId);
            
            return true;
        } catch (error) {
            console.error(`Error deleting image ${imageId}:`, error);
            throw new Error(`Failed to delete image: ${error.message}`);
        }
    }
    
    /**
     * Delete all images for a restaurant
     * @param {string|number} restaurantId - Restaurant ID
     * @return {Promise<Object>} - Promise with deletion results
     */
    async deleteRestaurantImages(restaurantId) {
        try {
            // Get photo references for this restaurant
            const photoRefs = await StorageModule.getItemsByIndex(
                this.photosStore, 'restaurantId', restaurantId
            );
            
            if (photoRefs.length === 0) {
                return { deleted: 0 };
            }
            
            // Delete each image
            const results = {
                total: photoRefs.length,
                deleted: 0,
                failed: 0,
                errors: []
            };
            
            for (const photoRef of photoRefs) {
                try {
                    await this.deleteImage(photoRef.id);
                    results.deleted++;
                } catch (error) {
                    results.failed++;
                    results.errors.push({
                        id: photoRef.id,
                        message: error.message
                    });
                }
            }
            
            return results;
        } catch (error) {
            console.error(`Error deleting images for restaurant ${restaurantId}:`, error);
            throw new Error(`Failed to delete restaurant images: ${error.message}`);
        }
    }
    
    /**
     * Process image upload from File object
     * @param {File} file - Image file
     * @param {string|number} restaurantId - Associated restaurant ID
     * @param {Object} options - Additional options
     * @return {Promise<Object>} - Promise with processed image
     */
    async processImageUpload(file, restaurantId, options = {}) {
        if (!file || !(file instanceof File || file instanceof Blob)) {
            throw new Error('Valid image file is required');
        }
        
        if (!restaurantId) {
            throw new Error('Restaurant ID is required');
        }
        
        try {
            // Read file as ArrayBuffer
            const imageBuffer = await this.readFileAsArrayBuffer(file);
            
            // Save the image
            const imageRef = await this.saveImage({
                data: imageBuffer,
                restaurantId,
                type: options.type || 'general'
            });
            
            return imageRef;
        } catch (error) {
            console.error('Error processing image upload:', error);
            throw new Error(`Failed to process image: ${error.message}`);
        }
    }
    
    /**
     * Read a file as ArrayBuffer
     * @param {File|Blob} file - File to read
     * @return {Promise<ArrayBuffer>} - Promise with file data
     */
    readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = () => {
                resolve(reader.result);
            };
            
            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };
            
            reader.readAsArrayBuffer(file);
        });
    }
}

// Singleton instance
const imageService = new ImageService();
