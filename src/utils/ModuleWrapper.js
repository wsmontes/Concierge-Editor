/**
 * Module wrapper utility to help with ES module loading and error handling
 * Displays initialization status and catches common import errors
 * 
 * @module ModuleWrapper
 */

class ModuleWrapper {
  constructor() {
    this.initialized = false;
    this.errors = [];
    
    // Log initial message
    console.log('ModuleWrapper: Initialized');
    
    // Add global error handler for module loading
    window.addEventListener('error', this.handleError.bind(this));
    
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', this.handleRejection.bind(this));
  }
  
  /**
   * Handle regular JS errors
   * @param {ErrorEvent} event - Error event
   */
  handleError(event) {
    // Only handle module loading errors
    if (event.filename && event.filename.includes('.js')) {
      this.errors.push({
        type: 'module-error',
        file: event.filename,
        message: event.message,
        time: new Date()
      });
      
      console.error(`ModuleWrapper: Error in ${event.filename.split('/').pop()}:`, event.message);
    }
  }
  
  /**
   * Handle unhandled promise rejections
   * @param {PromiseRejectionEvent} event - Rejection event
   */
  handleRejection(event) {
    // Try to extract file info from stack trace
    let file = 'unknown';
    if (event.reason && event.reason.stack) {
      const stackLines = event.reason.stack.split('\n');
      const match = stackLines.find(line => line.includes('.js'));
      if (match) {
        const fileMatch = match.match(/\/([\w-]+\.js)/);
        if (fileMatch && fileMatch[1]) {
          file = fileMatch[1];
        }
      }
    }
    
    this.errors.push({
      type: 'promise-rejection',
      file,
      message: event.reason ? (event.reason.message || String(event.reason)) : 'Unknown rejection',
      time: new Date()
    });
    
    console.warn(`ModuleWrapper: Unhandled promise rejection in ${file}:`, 
      event.reason ? (event.reason.message || event.reason) : 'Unknown reason');
  }
  
  /**
   * Check if all critical modules are loaded
   * @returns {boolean} Whether all critical modules are loaded
   */
  checkModulesLoaded() {
    const criticalModules = [
      'DatabaseService.js',
      'SettingsService.js',
      'SyncService.js',
      'app.js'
    ];
    
    const missingModules = criticalModules.filter(module => {
      return this.errors.some(error => error.file.includes(module));
    });
    
    return missingModules.length === 0;
  }
  
  /**
   * Display any module loading errors to the user
   */
  displayErrors() {
    if (this.errors.length === 0) return;
    
    // Create error message for UI
    const errorMessage = document.createElement('div');
    errorMessage.className = 'module-error-message';
    errorMessage.innerHTML = `
      <h3>Module Loading Errors</h3>
      <p>Some application modules failed to load. Please try refreshing the page.</p>
      <ul>
        ${this.errors.map(error => `<li>${error.file}: ${error.message}</li>`).join('')}
      </ul>
    `;
    
    // Style the error message
    Object.assign(errorMessage.style, {
      position: 'fixed',
      top: '20px',
      left: '20px',
      right: '20px',
      backgroundColor: '#f8d7da',
      color: '#721c24',
      padding: '15px',
      borderRadius: '5px',
      zIndex: '9999',
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
      maxHeight: '80vh',
      overflow: 'auto'
    });
    
    // Add a close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = 'float: right; background: #e9ecef; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;';
    closeBtn.onclick = () => document.body.removeChild(errorMessage);
    errorMessage.prepend(closeBtn);
    
    // Add to DOM
    document.body.appendChild(errorMessage);
  }
  
  /**
   * Define a new module class
   * @param {string} name - Module name
   * @param {Class} moduleClass - Module class definition
   * @returns {Class} The registered module class
   */
  defineClass(name, moduleClass) {
    if (this.modules.has(name)) {
      console.warn(`ModuleWrapper: Module ${name} already defined, overwriting`);
    }
    this.modules.set(name, moduleClass);
    return moduleClass;
  }

  /**
   * Create an instance of a module
   * @param {string} instanceName - Name for the instance
   * @param {string} moduleName - Name of the module to instantiate
   * @param  {...any} args - Constructor arguments
   * @returns {Object} Module instance
   */
  createInstance(instanceName, moduleName, ...args) {
    if (!this.modules.has(moduleName)) {
      throw new Error(`ModuleWrapper: Module ${moduleName} not defined`);
    }
    
    if (this.instances.has(instanceName)) {
      console.warn(`ModuleWrapper: Instance ${instanceName} already exists, returning existing`);
      return this.instances.get(instanceName);
    }
    
    const ModuleClass = this.modules.get(moduleName);
    const instance = new ModuleClass(...args);
    this.instances.set(instanceName, instance);
    return instance;
  }

  /**
   * Get an existing instance
   * @param {string} instanceName - Instance name
   * @returns {Object|undefined} Module instance or undefined if not found
   */
  getInstance(instanceName) {
    return this.instances.get(instanceName);
  }
}

// Create global instance
window.moduleWrapper = new ModuleWrapper();
export default window.moduleWrapper;
