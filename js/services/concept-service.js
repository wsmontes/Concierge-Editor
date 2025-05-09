/**
 * Concept Service - Manages concept entities
 * Dependencies: BaseService, StorageModule, ValidationService
 * Provides concept-specific business logic and data management
 */

const ConceptService = (function() {
    // Create base service for concepts
    const baseService = BaseService.createService(
        StorageModule.STORES.CONCEPTS,
        'concept',
        ValidationService.validateConcept
    );
    
    /**
     * Get all unique categories
     * @returns {Promise<Array<string>>} - Promise resolving to array of unique categories
     */
    async function getCategories() {
        try {
            const concepts = await baseService.getAll();
            const categories = new Set();
            
            concepts.forEach(concept => {
                if (concept.category) {
                    categories.add(concept.category);
                }
            });
            
            return Array.from(categories).sort();
        } catch (error) {
            ErrorHandlingService.handleError(error, 'Getting concept categories');
            return [];
        }
    }
    
    /**
     * Get concepts grouped by category
     * @returns {Promise<Object>} - Promise resolving to object with categories as keys
     */
    async function getConceptsByCategory() {
        try {
            const concepts = await baseService.getAll();
            const categorized = {};
            
            concepts.forEach(concept => {
                if (!concept.category) return;
                
                if (!categorized[concept.category]) {
                    categorized[concept.category] = [];
                }
                
                categorized[concept.category].push(concept);
            });
            
            // Sort concepts within each category
            Object.keys(categorized).forEach(category => {
                categorized[category].sort((a, b) => a.value.localeCompare(b.value));
            });
            
            return categorized;
        } catch (error) {
            ErrorHandlingService.handleError(error, 'Getting concepts by category');
            return {};
        }
    }
    
    /**
     * Get concept usage statistics
     * @returns {Promise<Array>} - Promise resolving to array of concepts with usage counts
     */
    async function getConceptUsageStats() {
        try {
            const [concepts, restaurantConcepts] = await Promise.all([
                baseService.getAll(),
                StorageModule.getAllItems(StorageModule.STORES.RESTAURANT_CONCEPTS)
            ]);
            
            // Count usage of each concept
            const countMap = {};
            restaurantConcepts.forEach(rc => {
                const conceptId = rc.conceptId;
                countMap[conceptId] = (countMap[conceptId] || 0) + 1;
            });
            
            // Create stats objects
            const stats = concepts.map(concept => ({
                id: concept.id,
                value: concept.value,
                category: concept.category,
                timestamp: concept.timestamp,
                usageCount: countMap[concept.id] || 0
            }));
            
            return stats;
        } catch (error) {
            ErrorHandlingService.handleError(error, 'Getting concept usage statistics');
            return [];
        }
    }
    
    /**
     * Search for concepts by value
     * @param {string} query - Search query
     * @param {string} category - Optional category filter
     * @returns {Promise<Array>} - Promise resolving to matching concepts
     */
    async function searchConcepts(query, category = null) {
        try {
            if (!query || query.length < 2) {
                return [];
            }
            
            const concepts = await baseService.getAll();
            const normalizedQuery = query.toLowerCase();
            
            return concepts.filter(concept => {
                // Apply category filter if specified
                if (category && concept.category !== category) {
                    return false;
                }
                
                // Search in concept value
                return concept.value.toLowerCase().includes(normalizedQuery);
            });
        } catch (error) {
            ErrorHandlingService.handleError(error, 'Searching concepts');
            return [];
        }
    }
    
    // Extend base service with concept-specific methods
    return {
        ...baseService,
        getCategories,
        getConceptsByCategory,
        getConceptUsageStats,
        searchConcepts
    };
})();
