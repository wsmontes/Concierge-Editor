/**
 * Validation Service - Data validation and schema verification
 * Dependencies: None
 * Provides standardized validation for all application data structures
 */

const ValidationService = (function() {
    /**
     * Validate restaurant data
     * @param {Object} restaurant - Restaurant data to validate
     * @return {Object} - Validation result with valid flag and error messages
     */
    function validateRestaurant(restaurant) {
        const errors = [];
        
        // Required fields
        if (!restaurant) {
            return {
                valid: false,
                message: 'Restaurant data is required',
                errors: ['Missing restaurant data']
            };
        }
        
        // Validate name
        if (!restaurant.name || restaurant.name.trim() === '') {
            errors.push('Restaurant name is required');
        }
        
        // Validate curator ID
        if (!restaurant.curatorId) {
            errors.push('Curator ID is required');
        }
        
        // Validate status if provided
        if (restaurant.status && !['draft', 'revised', 'production', 'archived'].includes(restaurant.status)) {
            errors.push('Invalid restaurant status');
        }
        
        // Validate timestamp if provided
        if (restaurant.timestamp) {
            const date = new Date(restaurant.timestamp);
            if (isNaN(date.getTime())) {
                errors.push('Invalid timestamp format');
            }
        }
        
        return {
            valid: errors.length === 0,
            message: errors.length === 0 ? 'Restaurant data is valid' : 'Restaurant validation failed',
            errors
        };
    }
    
    /**
     * Validate concept data
     * @param {Object} concept - Concept data to validate
     * @return {Object} - Validation result with valid flag and error messages
     */
    function validateConcept(concept) {
        const errors = [];
        
        // Required fields
        if (!concept) {
            return {
                valid: false,
                message: 'Concept data is required',
                errors: ['Missing concept data']
            };
        }
        
        // Validate category
        if (!concept.category || concept.category.trim() === '') {
            errors.push('Concept category is required');
        }
        
        // Validate value
        if (!concept.value || concept.value.trim() === '') {
            errors.push('Concept value is required');
        }
        
        return {
            valid: errors.length === 0,
            message: errors.length === 0 ? 'Concept data is valid' : 'Concept validation failed',
            errors
        };
    }
    
    /**
     * Validate location data
     * @param {Object} location - Location data to validate
     * @return {Object} - Validation result with valid flag and error messages
     */
    function validateLocation(location) {
        const errors = [];
        
        // Required fields
        if (!location) {
            return {
                valid: false,
                message: 'Location data is required',
                errors: ['Missing location data']
            };
        }
        
        // Validate restaurant ID
        if (!location.restaurantId) {
            errors.push('Restaurant ID is required for location');
        }
        
        // Validate latitude
        if (typeof location.latitude !== 'number' || isNaN(location.latitude) || 
            location.latitude < -90 || location.latitude > 90) {
            errors.push('Valid latitude (-90 to 90) is required');
        }
        
        // Validate longitude
        if (typeof location.longitude !== 'number' || isNaN(location.longitude) || 
            location.longitude < -180 || location.longitude > 180) {
            errors.push('Valid longitude (-180 to 180) is required');
        }
        
        return {
            valid: errors.length === 0,
            message: errors.length === 0 ? 'Location data is valid' : 'Location validation failed',
            errors
        };
    }
    
    /**
     * Validate imported data structure
     * @param {Object} data - Data to validate
     * @return {Object} - Validation result with valid flag and error messages
     */
    function validateImportData(data) {
        const errors = [];
        
        // Basic validation
        if (!data) {
            return {
                valid: false,
                message: 'No data provided for import',
                errors: ['Missing import data']
            };
        }
        
        // At minimum, we need restaurants or concepts
        if (!data.restaurants && !data.concepts) {
            errors.push('Import data must contain restaurants or concepts');
        }
        
        // If restaurants exist, validate structure
        if (data.restaurants) {
            if (!Array.isArray(data.restaurants)) {
                errors.push('Restaurants must be an array');
            } else {
                // Validate restaurant entries (first 5 for performance)
                const samplesToValidate = Math.min(data.restaurants.length, 5);
                for (let i = 0; i < samplesToValidate; i++) {
                    const restaurantValidation = validateRestaurant(data.restaurants[i]);
                    if (!restaurantValidation.valid) {
                        errors.push(`Invalid restaurant at index ${i}: ${restaurantValidation.errors.join(', ')}`);
                    }
                }
            }
        }
        
        // If concepts exist, validate structure
        if (data.concepts) {
            if (!Array.isArray(data.concepts)) {
                errors.push('Concepts must be an array');
            } else {
                // Validate concept entries (first 5 for performance)
                const samplesToValidate = Math.min(data.concepts.length, 5);
                for (let i = 0; i < samplesToValidate; i++) {
                    const conceptValidation = validateConcept(data.concepts[i]);
                    if (!conceptValidation.valid) {
                        errors.push(`Invalid concept at index ${i}: ${conceptValidation.errors.join(', ')}`);
                    }
                }
            }
        }
        
        // Check if restaurant concepts reference valid items
        if (data.restaurantConcepts && Array.isArray(data.restaurantConcepts)) {
            // Validate structure
            if (data.restaurantConcepts.some(rc => !rc.restaurantId || !rc.conceptId)) {
                errors.push('Restaurant concepts must have both restaurantId and conceptId');
            }
            
            // Check for references to non-existent restaurants/concepts
            if (data.restaurants && data.concepts) {
                const restaurantIds = new Set(data.restaurants.map(r => r.id));
                const conceptIds = new Set(data.concepts.map(c => c.id));
                
                data.restaurantConcepts.forEach((rc, i) => {
                    if (!restaurantIds.has(rc.restaurantId)) {
                        errors.push(`Restaurant concept at index ${i} references non-existent restaurant ID ${rc.restaurantId}`);
                    }
                    if (!conceptIds.has(rc.conceptId)) {
                        errors.push(`Restaurant concept at index ${i} references non-existent concept ID ${rc.conceptId}`);
                    }
                });
            }
        }
        
        return {
            valid: errors.length === 0,
            message: errors.length === 0 ? 'Import data is valid' : 'Import data validation failed',
            errors
        };
    }
    
    /**
     * Validate search criteria
     * @param {Object} criteria - Search criteria to validate
     * @return {Object} - Validation result with valid flag and error messages
     */
    function validateSearchCriteria(criteria) {
        const errors = [];
        
        // Criteria is optional
        if (!criteria) return { valid: true, message: 'No search criteria provided' };
        
        // Validate pagination parameters if present
        if (criteria.limit !== undefined) {
            if (typeof criteria.limit !== 'number' || criteria.limit < 0) {
                errors.push('Limit must be a non-negative number');
            }
        }
        
        if (criteria.offset !== undefined) {
            if (typeof criteria.offset !== 'number' || criteria.offset < 0) {
                errors.push('Offset must be a non-negative number');
            }
        }
        
        // Validate sort parameters if present
        if (criteria.sortBy && typeof criteria.sortBy !== 'string') {
            errors.push('Sort field must be a string');
        }
        
        if (criteria.sortDirection && !['asc', 'desc'].includes(criteria.sortDirection)) {
            errors.push('Sort direction must be "asc" or "desc"');
        }
        
        return {
            valid: errors.length === 0,
            message: errors.length === 0 ? 'Search criteria is valid' : 'Search criteria validation failed',
            errors
        };
    }
    
    /**
     * Sanitize a string for safe HTML display
     * @param {string} str - String to sanitize
     * @return {string} - Sanitized string
     */
    function sanitizeString(str) {
        if (!str || typeof str !== 'string') return '';
        return str
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    
    // Public API
    return {
        validateRestaurant,
        validateConcept,
        validateLocation,
        validateImportData,
        validateSearchCriteria,
        sanitizeString
    };
})();
