/**
 * Image Service - Manages image resources
 * Dependencies: BaseService, StorageModule, ErrorHandlingService
 * Provides image-specific business logic and data management
 */

const ImageService = (function() {
    // Create base service for photos
    const baseService = BaseService.createService(
        StorageModule.STORES.PHOTOS,
        'photo'
    );
    
    /**
     * Get images for a specific restaurant
     * @param {number} restaurantId - Restaurant ID
     * @returns {Promise<Array>} - Promise resolving to array of photos
     */
    async function getRestaurantImages(restaurantId) {
        try {
            return await StorageModule.getItemsByIndex(
                StorageModule.STORES.PHOTOS,
                'restaurantId',
                parseInt(restaurantId)
            );
        } catch (error) {
            ErrorHandlingService.handleError(error, `Getting images for restaurant ${restaurantId}`);
            return [];
        }
    }
    
    /**
     * Save an image
     * @param {number} restaurantId - Restaurant ID
     * @param {Blob|File} imageData - Image data to save
     * @param {Object} metadata - Optional metadata
     * @returns {Promise<Object>} - Promise resolving to saved image info
     */
    async function saveImage(restaurantId, imageData, metadata = {}) {
        try {
            // Create photo record
            const photo = {
                id: Date.now(),
                restaurantId: parseInt(restaurantId),
                timestamp: new Date().toISOString(),
                ...metadata
            };
            
            // Store the photo record
            await StorageModule.saveItem(StorageModule.STORES.PHOTOS, photo);
            
            // Store the image data in separate store
            await StorageModule.saveItem(StorageModule.STORES.IMAGES, {
                id: photo.id,
                data: imageData,
                restaurantId: parseInt(restaurantId)
            });
            
            return photo;
        } catch (error) {
            ErrorHandlingService.handleError(error, 'Saving image');
            throw error;
        }
    }
    
    /**
     * Get image URL for display
     * @param {number} imageId - Image ID
     * @returns {Promise<string|null>} - Promise resolving to image URL or null
     */
    async function getImageURL(imageId) {
        try {
            const imageData = await StorageModule.getItem(StorageModule.STORES.IMAGES, parseInt(imageId));
            
            if (!imageData || !imageData.data) {
                return null;
            }
            
            // Create object URL for the image data
            return URL.createObjectURL(imageData.data);
        } catch (error) {
            ErrorHandlingService.handleError(error, `Getting image URL for ${imageId}`);
            return null;
        }
    }
    
    /**
     * Delete an image
     * @param {number} imageId - Image ID to delete
     * @returns {Promise<boolean>} - Promise resolving to success flag
     */
    async function deleteImage(imageId) {
        try {
            const id = parseInt(imageId);
            
            // Delete both the photo record and the image data
            await Promise.all([
                StorageModule.deleteItem(StorageModule.STORES.PHOTOS, id),
                StorageModule.deleteItem(StorageModule.STORES.IMAGES, id)
            ]);
            
            return true;
        } catch (error) {
            ErrorHandlingService.handleError(error, `Deleting image ${imageId}`);
            return false;
        }
    }
    
    /**
     * Delete all images for a restaurant
     * @param {number} restaurantId - Restaurant ID
     * @returns {Promise<number>} - Promise resolving to count of deleted images
     */
    async function deleteRestaurantImages(restaurantId) {
        try {
            const photos = await getRestaurantImages(restaurantId);
            const imageIds = photos.map(photo => photo.id);
            
            let deletedCount = 0;
            for (const id of imageIds) {
                try {
                    await deleteImage(id);
                    deletedCount++;
                } catch (innerError) {
                    console.warn(`Error deleting image ${id}:`, innerError);
                }
            }
            
            return deletedCount;
        } catch (error) {
            ErrorHandlingService.handleError(error, `Deleting images for restaurant ${restaurantId}`);
            return 0;
        }
    }
    
    // Extend base service with image-specific methods
    return {
        ...baseService,
        getRestaurantImages,
        saveImage,
        getImageURL,
        deleteImage,
        deleteRestaurantImages
    };
})();
