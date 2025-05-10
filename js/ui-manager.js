/**
 * ui-manager.js
 * 
 * Purpose: Proxy module that re-exports the UIManager from the correct location.
 * This file resolves path resolution issues when scripts attempt to load UIManager
 * from the root js directory instead of the cms subdirectory.
 * 
 * Dependencies: js/cms/ui-manager.js
 */

(function() {
  // First check if UIManager is already defined (might be loaded elsewhere)
  if (window.UIManager) {
    console.info('UIManager already loaded, proxy not needed');
    return;
  }
  
  // Create a script element for traditional script loading
  const script = document.createElement('script');
  script.src = './cms/ui-manager.js';
  
  // Define success handler
  script.onload = function() {
    if (window.UIManager) {
      console.info('UIManager successfully loaded via proxy');
    } else {
      console.error('Failed to find UIManager object after loading script');
    }
  };
  
  // Define error handler
  script.onerror = function() {
    console.error('Error loading UIManager script from ./cms/ui-manager.js');
  };
  
  // Add script to the document to begin loading
  document.head.appendChild(script);
})();
