/**
 * json-format-handler.js
 * 
 * Purpose: Provides JSON import/export functionality with schema validation.
 * Loads and validates against JSON Schemas stored in the JSON-Schema folder.
 * 
 * Dependencies:
 *   - import-export-manager.js - Integrates with ImportExportManager
 *   - Ajv (optionally loaded at runtime if available)
 */

const JSONFormatHandler = (() => {
  // Path to JSON Schema definitions
  const SCHEMA_PATH = './schemas/';
  
  // Cache for loaded schemas
  const schemaCache = {};
  
  // Schema validator instance (will use Ajv if available)
  let validator = null;
  
  /**
   * Loads a JSON Schema from the schemas folder
   * @param {string} schemaName - Name of the schema to load
   * @returns {Promise<Object>} - The loaded schema object
   */
  const loadSchema = async (schemaName) => {
    // Return from cache if already loaded
    if (schemaCache[schemaName]) {
      return schemaCache[schemaName];
    }
    
    try {
      const response = await fetch(`${SCHEMA_PATH}${schemaName}.schema.json`);
      if (!response.ok) {
        throw new Error(`Failed to load schema (${response.status}): ${schemaName}`);
      }
      
      const schema = await response.json();
      schemaCache[schemaName] = schema;
      return schema;
    } catch (error) {
      console.error(`Error loading schema ${schemaName}:`, error);
      throw error;
    }
  };
  
  /**
   * Initializes the schema validator
   * @returns {Object} - The initialized validator
   */
  const initValidator = () => {
    if (validator) return validator;
    
    // Check if Ajv is available (preferred validator)
    if (typeof Ajv !== 'undefined') {
      validator = new Ajv({
        allErrors: true,
        verbose: true
      });
      console.log('Using Ajv for JSON Schema validation');
      return validator;
    }
    
    // Fallback to a simple validator when Ajv not available
    validator = {
      compile: (schema) => {
        return (data) => {
          // Basic validation - just check required properties
          if (schema.required && Array.isArray(schema.required)) {
            for (const prop of schema.required) {
              if (data[prop] === undefined) {
                return { valid: false, errors: [{ message: `Missing required property: ${prop}` }] };
              }
            }
          }
          return { valid: true };
        };
      },
      errors: []
    };
    
    console.warn('Ajv not found. Using limited validation capabilities.');
    return validator;
  };
  
  /**
   * Validates data against a JSON Schema
   * @param {Object} data - Data to validate
   * @param {string} schemaName - Name of the schema to validate against
   * @returns {Promise<Object>} - Validation result with isValid and errors
   */
  const validateAgainstSchema = async (data, schemaName) => {
    try {
      const schema = await loadSchema(schemaName);
      const validate = initValidator().compile(schema);
      
      // Using Ajv
      if (typeof validate === 'function' && typeof validate.errors !== 'undefined') {
        const valid = validate(data);
        return {
          isValid: valid,
          errors: valid ? [] : validate.errors
        };
      }
      
      // Using fallback validator
      const result = validate(data);
      return {
        isValid: result.valid,
        errors: result.valid ? [] : result.errors
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [{ message: `Schema validation error: ${error.message}` }]
      };
    }
  };
  
  /**
   * Detects the appropriate schema for the data structure
   * @param {Object} data - Data to analyze
   * @returns {string|null} - Detected schema name or null if unknown
   */
  const detectSchema = (data) => {
    // Check for entity type indicators in the data
    if (data.restaurants && Array.isArray(data.restaurants)) {
      return 'restaurant';
    }
    
    // Add more schema detection rules here
    
    // Default return if no schema detected
    return null;
  };

  // Format handler definition
  const handler = {
    formatName: 'JSON with Schema',
    fileExtension: '.json',
    mimeType: 'application/json',
    
    /**
     * Imports data from JSON string with schema validation
     * @param {string} dataString - JSON string to import
     * @param {Object} options - Import options
     * @returns {Promise<Object>} - The parsed and validated data
     */
    importData: async (dataString, options = {}) => {
      try {
        // Parse the JSON data
        const data = JSON.parse(dataString);
        
        // Determine schema to validate against
        const schemaName = options.schema || detectSchema(data);
        
        // Validate against schema if available
        if (schemaName) {
          const validation = await validateAgainstSchema(data, schemaName);
          if (!validation.isValid) {
            const errorMessages = validation.errors.map(e => e.message || JSON.stringify(e)).join('; ');
            throw new Error(`Schema validation failed: ${errorMessages}`);
          }
        }
        
        return data;
      } catch (error) {
        if (error.name === 'SyntaxError') {
          throw new Error(`Invalid JSON format: ${error.message}`);
        }
        throw error;
      }
    },
    
    /**
     * Exports data to JSON string
     * @param {Object} data - Data to export
     * @param {Object} options - Export options
     * @returns {Promise<string>} - The stringified JSON data
     */
    exportData: async (data, options = {}) => {
      const indent = options.pretty ? 2 : 0;
      
      try {
        if (options.schema) {
          // Validate before export if schema specified
          const validation = await validateAgainstSchema(data, options.schema);
          if (!validation.isValid) {
            const errorMessages = validation.errors.map(e => e.message || JSON.stringify(e)).join('; ');
            throw new Error(`Schema validation failed: ${errorMessages}`);
          }
        }
        
        return JSON.stringify(data, null, indent);
      } catch (error) {
        if (error.message.includes('Schema validation failed')) {
          throw error;
        }
        throw new Error(`JSON serialization error: ${error.message}`);
      }
    },
    
    /**
     * Validates JSON string format and optionally against schema
     * @param {string} dataString - JSON string to validate
     * @param {Object} options - Validation options
     * @returns {Object} - Validation result with isValid and message
     */
    validate: async (dataString, options = {}) => {
      try {
        // Check if valid JSON
        const data = JSON.parse(dataString);
        
        // Schema validation (if schema provided or detected)
        const schemaName = options.schema || detectSchema(data);
        if (schemaName) {
          const validation = await validateAgainstSchema(data, schemaName);
          if (!validation.isValid) {
            const errorMessages = validation.errors.map(e => e.message || JSON.stringify(e)).join('; ');
            return { isValid: false, message: `Schema validation failed: ${errorMessages}` };
          }
        }
        
        return { isValid: true };
      } catch (error) {
        return { 
          isValid: false, 
          message: error.name === 'SyntaxError' 
            ? `Invalid JSON: ${error.message}` 
            : error.message 
        };
      }
    },
    
    // Additional utility functions
    loadSchema,
    getAvailableSchemas: async () => {
      try {
        const response = await fetch(`${SCHEMA_PATH}index.json`);
        if (!response.ok) {
          throw new Error(`Failed to load schema index (${response.status})`);
        }
        return await response.json();
      } catch (error) {
        console.error('Error loading available schemas:', error);
        return [];
      }
    }
  };

  // Register this handler with ImportExportManager if available
  if (window.ImportExportManager) {
    window.ImportExportManager.registerFormatHandler('json', handler);
    console.log('JSON format handler registered with ImportExportManager');
  } else {
    console.warn('ImportExportManager not found. JSON format handler not registered.');
  }

  return handler;
})();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = JSONFormatHandler;
} else {
  window.JSONFormatHandler = JSONFormatHandler;
}
