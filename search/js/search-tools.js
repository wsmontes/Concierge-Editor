/**
 * search-tools.js
 * 
 * Purpose: Manages search queries and result processing
 * Provides utilities for search operations including filtering, sorting, and query building
 * 
 * Dependencies:
 *   - search-service.js - For executing core search functionality against the data layer
 */

const SearchTools = (() => {
    /**
     * Executes a search with the given parameters
     * @param {string} dataType - Type of data to search (restaurants, concepts, curators)
     * @param {Object} criteria - Search criteria 
     * @param {string} sortField - Field to sort by
     * @param {string} sortDirection - Sort direction (asc or desc)
     * @returns {Promise<Array>} Search results
     */
    const executeSearch = async (dataType, criteria = {}, sortField = 'name', sortDirection = 'asc') => {
        try {
            // Get search results from SearchService
            const results = await SearchService.search(dataType, criteria);
            
            // Sort the results
            const sorted = sortResults(results, sortField, sortDirection);
            
            return sorted;
        } catch (error) {
            console.error(`Search execution error for ${dataType}:`, error);
            throw error;
        }
    };
    
    /**
     * Sorts search results by the specified field and direction
     * @param {Array} results - Search results to sort
     * @param {string} field - Field to sort by
     * @param {string} direction - Sort direction (asc or desc)
     * @returns {Array} Sorted results
     */
    const sortResults = (results, field, direction) => {
        if (!results || !Array.isArray(results) || results.length === 0) {
            return [];
        }
        
        // Make a copy to avoid mutating the original
        const sortedResults = [...results];
        
        // Sort the results
        sortedResults.sort((a, b) => {
            // Handle cases where the field might not exist
            const aValue = a[field] !== undefined ? a[field] : '';
            const bValue = b[field] !== undefined ? b[field] : '';
            
            // Handle different data types
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                return direction === 'asc' 
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue);
            } else if (!isNaN(aValue) && !isNaN(bValue)) {
                // Numeric comparison
                return direction === 'asc'
                    ? aValue - bValue
                    : bValue - aValue;
            } else if (aValue instanceof Date && bValue instanceof Date) {
                // Date comparison
                return direction === 'asc'
                    ? aValue.getTime() - bValue.getTime()
                    : bValue.getTime() - aValue.getTime();
            } else {
                // Convert to string for generic comparison
                const aString = String(aValue);
                const bString = String(bValue);
                return direction === 'asc'
                    ? aString.localeCompare(bString)
                    : bString.localeCompare(aString);
            }
        });
        
        return sortedResults;
    };
    
    /**
     * Builds search criteria object based on form parameters
     * @param {HTMLFormElement} form - The search form element
     * @returns {Object} Search criteria object
     */
    const buildCriteriaFromForm = (form) => {
        const criteria = {};
        
        // Get keyword
        const keyword = form.querySelector('[name="keyword"]');
        if (keyword && keyword.value.trim()) {
            criteria.keyword = keyword.value.trim();
        }
        
        // Get selected filters
        const filters = form.querySelectorAll('select, input[type="checkbox"]:checked');
        filters.forEach(filter => {
            if (filter.name && filter.value && filter.name !== 'keyword') {
                criteria[filter.name] = filter.value;
            }
        });
        
        return criteria;
    };
    
    /**
     * Calculates search relevance score for a result item
     * @param {Object} item - Result item
     * @param {string} keyword - Search keyword
     * @returns {number} Relevance score (higher is more relevant)
     */
    const calculateRelevance = (item, keyword) => {
        if (!keyword || keyword.trim() === '') {
            return 0;
        }
        
        let score = 0;
        const lowerKeyword = keyword.toLowerCase();
        
        // Check the name field (highest relevance)
        if (item.name && item.name.toLowerCase().includes(lowerKeyword)) {
            score += 10;
            // Exact match is even better
            if (item.name.toLowerCase() === lowerKeyword) {
                score += 5;
            }
        }
        
        // Check description (medium relevance)
        if (item.description && item.description.toLowerCase().includes(lowerKeyword)) {
            score += 5;
        }
        
        // Check other fields (lower relevance)
        ['category', 'value', 'address', 'city', 'state'].forEach(field => {
            if (item[field] && item[field].toLowerCase().includes(lowerKeyword)) {
                score += 3;
            }
        });
        
        return score;
    };
    
    /**
     * Highlights search keywords in text
     * @param {string} text - The text to highlight
     * @param {string} keyword - The keyword to highlight
     * @returns {string} HTML with highlighted keywords
     */
    const highlightKeywords = (text, keyword) => {
        if (!text || !keyword || keyword.trim() === '') {
            return String(text || '');
        }
        
        const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return String(text).replace(regex, '<mark>$1</mark>');
    };
    
    /**
     * Filters search results to remove duplicates by a key
     * @param {Array} results - Search results array
     * @param {string} key - Key to use for uniqueness check
     * @returns {Array} Filtered results without duplicates
     */
    const removeDuplicates = (results, key = 'id') => {
        const seen = new Set();
        return results.filter(item => {
            const value = item[key];
            if (seen.has(value)) {
                return false;
            }
            seen.add(value);
            return true;
        });
    };
    
    // Public API
    return {
        executeSearch,
        sortResults,
        buildCriteriaFromForm,
        calculateRelevance,
        highlightKeywords,
        removeDuplicates
    };
})();
