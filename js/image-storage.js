/**
 * image-storage.js
 * 
 * Purpose: Proxy module that re-exports the ImageStorage service from the correct location.
 * This file resolves path resolution issues when scripts attempt to load ImageStorage
 * from the root js directory instead of the services subdirectory.
 * 
 * Dependencies: js/services/image-storage.js
 */

(function() {
  // First check if ImageStorage is already defined (might be loaded elsewhere)
  if (window.ImageStorage) {
    console.info('ImageStorage already loaded, proxy not needed');
    
    // Still ensure ConciergeData registration even if already loaded
    if (window.ConciergeData && typeof window.ConciergeData.registerModel === 'function' && 
        window.ImageStorage.onDataImported) {
      console.info('Ensuring ImageStorage is registered with ConciergeData');
      window.ConciergeData.registerModel('imageStorage', {
        initialize: window.ImageStorage.initialize,
        onDataImported: window.ImageStorage.onDataImported
      });
    }
    
    return;
  }
  
  // Create a script element for traditional script loading
  const script = document.createElement('script');
  script.src = './services/image-storage.js';
  
  // Define success handler
  script.onload = function() {
    if (window.ImageStorage) {
      console.info('ImageStorage successfully loaded via proxy');
      
      // Ensure the service is registered with ConciergeData
      if (window.ConciergeData && typeof window.ConciergeData.registerModel === 'function' && 
          window.ImageStorage.onDataImported) {
        console.info('Registering ImageStorage with ConciergeData via proxy');
        window.ConciergeData.registerModel('imageStorage', {
          initialize: window.ImageStorage.initialize,
          onDataImported: window.ImageStorage.onDataImported
        });
      }
    } else {
      console.error('Failed to find ImageStorage object after loading script');
      
      // Create fallback placeholder image for missing service
      const PLACEHOLDER = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22200%22%20height%3D%22150%22%3E%3Crect%20width%3D%22200%22%20height%3D%22150%22%20fill%3D%22%23EEEEEE%22%2F%3E%3Ctext%20x%3D%22100%22%20y%3D%2275%22%20font-family%3D%22Arial%22%20font-size%3D%2214%22%20text-anchor%3D%22middle%22%20alignment-baseline%3D%22middle%22%20fill%3D%22%23AAAAAA%22%3EService%20unavailable%3C%2Ftext%3E%3C%2Fsvg%3E';
      
      // Create a fallback ImageStorage implementation
      window.ImageStorage = {
        initialize: () => Promise.resolve(),
        getImage: () => Promise.resolve(null),
        loadAndCacheImage: () => Promise.resolve(PLACEHOLDER),
        storeImage: () => Promise.resolve(),
        clearAllImages: () => Promise.resolve(),
        checkImageExistence: () => Promise.resolve(false),
        storeDataUrl: () => Promise.resolve(null),
        getPlaceholder: () => PLACEHOLDER,
        onDataImported: (data) => {
          console.log('Fallback image import handler called');
          return Promise.resolve(0);
        }
      };
      
      // Register fallback with ConciergeData
      if (window.ConciergeData && typeof window.ConciergeData.registerModel === 'function') {
        window.ConciergeData.registerModel('imageStorage', {
          initialize: () => Promise.resolve(),
          onDataImported: window.ImageStorage.onDataImported
        });
      }
      
      console.info('Using fallback ImageStorage implementation');
    }
  };
  
  // Define error handler
  script.onerror = function() {
    console.error('Error loading ImageStorage script from ./services/image-storage.js');
    
    // Create fallback placeholder image for missing service
    const PLACEHOLDER = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22200%22%20height%3D%22150%22%3E%3Crect%20width%3D%22200%22%20height%3D%22150%22%20fill%3D%22%23EEEEEE%22%2F%3E%3Ctext%20x%3D%22100%22%20y%3D%2275%22%20font-family%3D%22Arial%22%20font-size%3D%2214%22%20text-anchor%3D%22middle%22%20alignment-baseline%3D%22middle%22%20fill%3D%22%23AAAAAA%22%3EService%20unavailable%3C%2Ftext%3E%3C%2Fsvg%3E';
    
    // Create a fallback ImageStorage implementation
    window.ImageStorage = {
      initialize: () => Promise.resolve(),
      getImage: () => Promise.resolve(null),
      loadAndCacheImage: () => Promise.resolve(PLACEHOLDER),
      storeImage: () => Promise.resolve(),
      clearAllImages: () => Promise.resolve(),
      checkImageExistence: () => Promise.resolve(false),
      storeDataUrl: () => Promise.resolve(null),
      getPlaceholder: () => PLACEHOLDER,
      onDataImported: (data) => {
        console.log('Fallback image import handler called (error path)');
        return Promise.resolve(0);
      }
    };
    
    // Register fallback with ConciergeData
    if (window.ConciergeData && typeof window.ConciergeData.registerModel === 'function') {
      window.ConciergeData.registerModel('imageStorage', {
        initialize: () => Promise.resolve(),
        onDataImported: window.ImageStorage.onDataImported
      });
    }
    
    console.info('Using fallback ImageStorage implementation due to load error');
  };
  
  // Add script to the document to begin loading
  document.head.appendChild(script);
})();
