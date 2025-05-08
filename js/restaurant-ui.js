/**
 * Restaurant UI - Handles UI interactions for the restaurant section
 * Dependencies: restaurant.js module
 */

document.addEventListener('DOMContentLoaded', function() {
    // Advanced search panel toggle
    const advancedSearchBtn = document.getElementById('advanced-search-btn');
    const advancedSearchPanel = document.getElementById('advanced-search-panel');
    const closeAdvancedSearch = document.querySelector('.close-advanced-search');
    
    if (advancedSearchBtn && advancedSearchPanel) {
        advancedSearchBtn.addEventListener('click', function() {
            advancedSearchPanel.classList.toggle('active');
            advancedSearchBtn.classList.toggle('active');
        });
    }
    
    if (closeAdvancedSearch && advancedSearchPanel) {
        closeAdvancedSearch.addEventListener('click', function() {
            advancedSearchPanel.classList.remove('active');
            if (advancedSearchBtn) {
                advancedSearchBtn.classList.remove('active');
            }
        });
    }
    
    // Advanced search form submission
    const advancedSearchForm = document.getElementById('advanced-search-form');
    if (advancedSearchForm) {
        advancedSearchForm.addEventListener('submit', function(event) {
            event.preventDefault();
            
            // Build search criteria object
            const searchCriteria = {
                text: document.getElementById('search-name')?.value || '',
                curatorId: document.getElementById('search-curator')?.value || '',
                conceptId: document.getElementById('search-concept')?.value || '',
                dateFrom: document.getElementById('search-date-from')?.value || null,
                dateTo: document.getElementById('search-date-to')?.value || null,
                statuses: Array.from(document.querySelectorAll('input[name="status"]:checked')).map(el => el.value),
                hasDescription: document.querySelector('input[name="has_description"]')?.checked || false,
                hasTranscription: document.querySelector('input[name="has_transcription"]')?.checked || false,
                hasImages: document.querySelector('input[name="has_images"]')?.checked || false,
                hasLocation: document.querySelector('input[name="has_location"]')?.checked || false
            };
            
            // Call the restaurant module's updateRestaurantListings with search criteria
            if (typeof RestaurantModule !== 'undefined' && RestaurantModule.updateRestaurantListings) {
                RestaurantModule.updateRestaurantListings(searchCriteria);
                
                // Hide the panel after search
                advancedSearchPanel.classList.remove('active');
                if (advancedSearchBtn) {
                    advancedSearchBtn.classList.remove('active');
                }
            }
        });
    }
    
    // Reset search form
    const resetSearchBtn = document.getElementById('reset-search');
    if (resetSearchBtn && advancedSearchForm) {
        resetSearchBtn.addEventListener('click', function() {
            advancedSearchForm.reset();
        });
    }
    
    // Empty state "Add Restaurant" button
    const emptyAddRestaurantBtn = document.getElementById('empty-add-restaurant');
    const sectionAddRestaurantBtn = document.getElementById('section-add-restaurant');
    
    if (emptyAddRestaurantBtn && sectionAddRestaurantBtn) {
        emptyAddRestaurantBtn.addEventListener('click', function() {
            // Trigger the same action as the main "Add Restaurant" button
            sectionAddRestaurantBtn.click();
        });
    }
    
    // Ensure view toggle buttons have data attributes
    const viewToggleButtons = document.querySelectorAll('.view-toggle-btn');
    viewToggleButtons.forEach(button => {
        // Make sure the saved view mode is applied on page load
        const savedViewMode = localStorage.getItem('restaurantViewMode') || 'grid';
        const buttonView = button.getAttribute('data-view');
        
        if (buttonView === savedViewMode) {
            button.classList.add('active');
            
            // Apply the saved view mode class to the restaurant list container
            const restaurantListContainer = document.getElementById('restaurant-list');
            if (restaurantListContainer) {
                restaurantListContainer.classList.add(`${savedViewMode}-view`);
            }
        }
    });
});
