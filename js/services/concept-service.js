/**
 * Concept Service - Handles concept data operations
 * Dependencies: BaseService, StorageModule
 * Provides comprehensive concept management functionality
 */

class ConceptService extends BaseService {
    /**
     * Initialize the concept service
     */
    constructor() {
        super(StorageModule.STORES.CONCEPTS);
        
        // Additional stores used by this service
        this.conceptRelationsStore = StorageModule.STORES.RESTAURANT_CONCEPTS;
    }
    
    /**
     * Get all concept categories
     * @return {Promise<Array>} - Promise with unique categories
     */
    async getCategories() {
        try {
            const concepts = await this.getAll();
            const categoriesSet = new Set();
            
            concepts.forEach(concept => {
                if (concept.category) {
                    categoriesSet.add(concept.category);
                }
            });
            
            return Array.from(categoriesSet).sort();
        } catch (error) {
            console.error('Error getting concept categories:', error);
            throw new Error(`Failed to get concept categories: ${error.message}`);
        }
    }
    
    /**
     * Group concepts by category
     * @return {Promise<Object>} - Promise with concepts grouped by category
     */
    async getConceptsByCategory() {
        try {
            const concepts = await this.getAll();
            const categorizedConcepts = {};
            
            // Group concepts by category
            concepts.forEach(concept => {
                const category = concept.category || 'Uncategorized';
                
                if (!categorizedConcepts[category]) {
                    categorizedConcepts[category] = [];
                }
                
                categorizedConcepts[category].push(concept);
            });
            
            // Sort concepts within each category
            Object.keys(categorizedConcepts).forEach(category => {
                categorizedConcepts[category].sort((a, b) => 
                    a.value.localeCompare(b.value)
                );
            });
            
            return categorizedConcepts;
        } catch (error) {
            console.error('Error grouping concepts by category:', error);
            throw new Error(`Failed to group concepts: ${error.message}`);
        }
    }
    
    /**
     * Get concepts for a specific restaurant
     * @param {string|number} restaurantId - Restaurant ID
     * @return {Promise<Array>} - Promise with restaurant's concepts
     */
    async getConceptsForRestaurant(restaurantId) {
        try {
            // Get concept relations for this restaurant
            const relations = await StorageModule.getItemsByIndex(
                this.conceptRelationsStore, 'restaurantId', restaurantId
            );
            
            if (relations.length === 0) {
                return [];
            }
            
            // Get all concepts
            const allConcepts = await this.getAll();
            
            // Filter concepts by IDs from relations
            const conceptIds = relations.map(rel => rel.conceptId);
            return allConcepts.filter(concept => conceptIds.includes(concept.id));
        } catch (error) {
            console.error(`Error getting concepts for restaurant ${restaurantId}:`, error);
            throw new Error(`Failed to get restaurant concepts: ${error.message}`);
        }
    }
    
    /**
     * Get usage statistics for concepts
     * @return {Promise<Array>} - Promise with concepts and their usage counts
     */
    async getConceptUsageStats() {
        try {
            // Get all concepts and relations
            const [concepts, relations] = await Promise.all([
                this.getAll(),
                StorageModule.getAllItems(this.conceptRelationsStore)
            ]);
            
            // Count usage of each concept
            const usageCounts = {};
            relations.forEach(relation => {
                const conceptId = relation.conceptId;
                usageCounts[conceptId] = (usageCounts[conceptId] || 0) + 1;
            });
            
            // Add usage count to each concept
            return concepts.map(concept => ({
                ...concept,
                usageCount: usageCounts[concept.id] || 0
            }));
        } catch (error) {
            console.error('Error getting concept usage stats:', error);
            throw new Error(`Failed to get concept statistics: ${error.message}`);
        }
    }
    
    /**
     * Find duplicated or similar concepts
     * @param {number} similarityThreshold - Similarity threshold (0-1)
     * @return {Promise<Array>} - Promise with groups of similar concepts
     */
    async findSimilarConcepts(similarityThreshold = 0.8) {
        try {
            const concepts = await this.getAll();
            const similarityGroups = [];
            
            // Simple implementation using case-insensitive comparison
            // A more sophisticated implementation could use string distance algorithms
            
            // Group by lowercase value
            const valueGroups = {};
            concepts.forEach(concept => {
                const normalizedValue = concept.value.toLowerCase();
                
                if (!valueGroups[normalizedValue]) {
                    valueGroups[normalizedValue] = [];
                }
                
                valueGroups[normalizedValue].push(concept);
            });
            
            // Find groups with multiple concepts
            Object.values(valueGroups)
                .filter(group => group.length > 1)
                .forEach(group => {
                    similarityGroups.push(group);
                });
            
            return similarityGroups;
        } catch (error) {
            console.error('Error finding similar concepts:', error);
            throw new Error(`Failed to analyze concept similarities: ${error.message}`);
        }
    }
    
    /**
     * Merge multiple concepts into one
     * @param {string|number} targetConceptId - ID of the concept to keep
     * @param {Array<string|number>} conceptIdsToMerge - IDs of concepts to merge
     * @return {Promise<Object>} - Promise with merge results
     */
    async mergeConcepts(targetConceptId, conceptIdsToMerge) {
        if (!targetConceptId || !Array.isArray(conceptIdsToMerge) || conceptIdsToMerge.length === 0) {
            throw new Error('Target concept ID and concepts to merge are required');
        }
        
        try {
            // Verify target concept exists
            const targetConcept = await this.getById(targetConceptId);
            
            // Get all relations for concepts to be merged
            const allRelations = await StorageModule.getAllItems(this.conceptRelationsStore);
            
            // Find relations that need to be updated
            const relationsToUpdate = allRelations.filter(relation => 
                conceptIdsToMerge.includes(relation.conceptId)
            );
            
            // Update relations to point to target concept
            for (const relation of relationsToUpdate) {
                const updatedRelation = {
                    ...relation,
                    conceptId: targetConceptId
                };
                
                await StorageModule.saveItem(this.conceptRelationsStore, updatedRelation);
            }
            
            // Delete merged concepts
            for (const conceptId of conceptIdsToMerge) {
                if (conceptId !== targetConceptId) {
                    await this.delete(conceptId);
                }
            }
            
            return {
                success: true,
                targetConcept,
                relationsUpdated: relationsToUpdate.length,
                conceptsDeleted: conceptIdsToMerge.filter(id => id !== targetConceptId).length
            };
        } catch (error) {
            console.error('Error merging concepts:', error);
            throw new Error(`Failed to merge concepts: ${error.message}`);
        }
    }

    /**
     * Count total concepts
     * @return {Promise<number>} Number of concepts
     */
    async count() {
        try {
            return await StorageModule.countItems(StorageModule.STORES.CONCEPTS);
        } catch (error) {
            console.error('Error counting concepts:', error);
            throw error;
        }
    }
}

// Singleton instance
const conceptService = new ConceptService();
