/**
 * Main JavaScript entry point for Concierge Editor
 * Initializes all modules and handles application startup
 * Dependencies: All module files, StorageModule, UIModule
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize UI modules
    SidebarModule.init();
    NavigationModule.init();
    FormControlsModule.init();
    
    // Initialize storage first to ensure database is ready
    StorageModule.initDatabase().then(() => {
        console.log('Storage initialized');
        
        // Initialize feature modules
        DashboardModule.init();
        RestaurantModule.init();
        ConceptModule.init();
        GalleryModule.init();
        ImportExportModule.init();
        SearchModule.init();
        
        // Update statistics and dashboard data
        updateAppStats();
        updateDashboardData();
        
        // Initialize advanced restaurant manager functionality
        initRestaurantManager();
    }).catch(error => {
        console.error('Error initializing storage:', error);
        UIModule.showToast('Error initializing application. Please refresh the page.', 'error');
    });
    
    console.log('Concierge Editor initialized');
});

/**
 * Update application statistics across all modules
 */
function updateAppStats() {
    // Get stats from localStorage
    const restaurants = JSON.parse(localStorage.getItem('restaurants') || '[]');
    const concepts = JSON.parse(localStorage.getItem('concepts') || '[]');
    const locations = JSON.parse(localStorage.getItem('restaurantLocations') || '[]');
    const photos = JSON.parse(localStorage.getItem('restaurantPhotos') || '[]');
    
    // Update dashboard stats
    const restaurantTotal = document.getElementById('restaurant-total');
    const conceptTotal = document.getElementById('concept-total');
    const locationTotal = document.getElementById('location-total');
    const mediaTotal = document.getElementById('media-total');
    
    if (restaurantTotal) restaurantTotal.textContent = restaurants.length;
    if (conceptTotal) conceptTotal.textContent = concepts.length;
    if (locationTotal) locationTotal.textContent = locations.length;
    if (mediaTotal) mediaTotal.textContent = photos.length;
    
    // Get restaurant status statistics
    const statusCounts = restaurants.reduce((acc, restaurant) => {
        const status = restaurant.status || 'draft'; // Default to draft if no status
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {});
    
    // Update restaurant status counts if elements exist
    const statuses = ['draft', 'revised', 'production', 'archived'];
    statuses.forEach(status => {
        const count = statusCounts[status] || 0;
        const element = document.getElementById(`${status}-count`);
        if (element) element.textContent = count;
    });
}

/**
 * Update dashboard with recent imports and popular concepts
 */
function updateDashboardData() {
    // Update import history
    ImportExportModule.updateImportHistoryUI();
    
    // Update recent imports in dashboard
    const recentImportsList = document.getElementById('recent-imports');
    if (recentImportsList) {
        const importHistory = JSON.parse(localStorage.getItem('importHistory') || '[]');
        
        if (importHistory.length === 0) {
            recentImportsList.innerHTML = '<li class="empty-list">No recent imports</li>';
            return;
        }
        
        recentImportsList.innerHTML = '';
        
        // Show up to 3 most recent imports
        const recentImports = importHistory.slice(0, 3);
        
        recentImports.forEach(item => {
            const date = new Date(item.timestamp).toLocaleString();
            const historyItem = document.createElement('li');
            historyItem.innerHTML = `
                <div class="activity-item">
                    <div class="activity-icon"><i class="fas fa-file-import"></i></div>
                    <div class="activity-details">
                        <h4>${item.fileName}</h4>
                        <p>${item.recordCount ? `${item.recordCount.restaurants || 0} restaurants, ${item.recordCount.photos || 0} photos` : 'Import completed'}</p>
                        <span class="activity-time">${date}</span>
                    </div>
                </div>
            `;
            recentImportsList.appendChild(historyItem);
        });
    }
    
    // Initialize popular concepts visualization
    updatePopularConcepts();
}

/**
 * Update popular concepts visualization
 */
function updatePopularConcepts() {
    const tagsContainer = document.getElementById('popular-concepts');
    if (!tagsContainer) return;
    
    // Get concepts and restaurant-concept associations
    const concepts = JSON.parse(localStorage.getItem('concepts') || '[]');
    const restaurantConcepts = JSON.parse(localStorage.getItem('restaurantConcepts') || '[]');
    
    // Count concept usage
    const conceptCounts = {};
    restaurantConcepts.forEach(rc => {
        if (!conceptCounts[rc.conceptId]) {
            conceptCounts[rc.conceptId] = 0;
        }
        conceptCounts[rc.conceptId]++;
    });
    
    // Sort concepts by usage count
    const sortedConcepts = concepts
        .map(concept => ({
            ...concept,
            count: conceptCounts[concept.id] || 0
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15); // Take top 15 concepts
    
    // Calculate font sizes based on usage count
    const maxCount = Math.max(...sortedConcepts.map(c => c.count), 1);
    const minFontSize = 0.8;
    const maxFontSize = 1.8;
    
    // Clear container
    tagsContainer.innerHTML = '';
    
    // Create concept tags
    sortedConcepts.forEach(concept => {
        if (concept.count === 0) return; // Skip unused concepts
        
        const fontSize = minFontSize + ((concept.count / maxCount) * (maxFontSize - minFontSize));
        const tag = document.createElement('span');
        tag.className = 'tag';
        tag.style.fontSize = `${fontSize}rem`;
        tag.textContent = concept.value;
        tag.title = `${concept.category}: ${concept.value} (Used in ${concept.count} restaurants)`;
        
        // Add click handler to filter by this concept
        tag.addEventListener('click', function() {
            // Navigate to restaurant section
            NavigationModule.navigateTo('restaurants');
            
            // Apply concept filter if the SearchModule supports it
            if (typeof SearchModule.filterByConcept === 'function') {
                SearchModule.filterByConcept(concept.id);
            }
        });
        
        tagsContainer.appendChild(tag);
    });
}

/**
 * Initialize restaurant manager with advanced functionality
 */
function initRestaurantManager() {
    // Advanced search panel toggle
    const advancedSearchBtn = document.getElementById('advanced-search-btn');
    const advancedSearchPanel = document.getElementById('advanced-search-panel');
    const closeAdvancedSearchBtn = document.querySelector('.close-advanced-search');
    
    if (advancedSearchBtn && advancedSearchPanel) {
        advancedSearchBtn.addEventListener('click', function() {
            advancedSearchPanel.classList.toggle('active');
        });
    }
    
    if (closeAdvancedSearchBtn && advancedSearchPanel) {
        closeAdvancedSearchBtn.addEventListener('click', function() {
            advancedSearchPanel.classList.remove('active');
        });
    }
    
    // Advanced search form handling
    const advancedSearchForm = document.getElementById('advanced-search-form');
    const resetSearchBtn = document.getElementById('reset-search');
    
    if (advancedSearchForm) {
        advancedSearchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Collect search criteria
            const searchCriteria = {
                name: document.getElementById('search-name')?.value || '',
                curatorId: document.getElementById('search-curator')?.value || '',
                conceptId: document.getElementById('search-concept')?.value || '',
                dateFrom: document.getElementById('search-date-from')?.value || '',
                dateTo: document.getElementById('search-date-to')?.value || '',
                statuses: Array.from(document.querySelectorAll('input[name="status"]:checked')).map(el => el.value),
                hasDescription: document.querySelector('input[name="has_description"]')?.checked,
                hasTranscription: document.querySelector('input[name="has_transcription"]')?.checked,
                hasImages: document.querySelector('input[name="has_images"]')?.checked,
                hasLocation: document.querySelector('input[name="has_location"]')?.checked
            };
            
            // Apply advanced search
            SearchModule.applyAdvancedSearch(searchCriteria);
            
            // Close the panel
            advancedSearchPanel.classList.remove('active');
            
            // Update UI
            UIModule.showToast('Search filter applied', 'success');
        });
    }
    
    if (resetSearchBtn) {
        resetSearchBtn.addEventListener('click', function() {
            if (advancedSearchForm) {
                advancedSearchForm.reset();
            }
        });
    }
    
    // Populate curator dropdown in advanced search
    populateCuratorFilter();
    
    // Populate concept dropdown in advanced search
    populateConceptFilter();
    
    // Status filter handling
    const statusFilter = document.getElementById('status-filter');
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            RestaurantModule.updateRestaurantListings();
        });
        
        // Initialize with all restaurants
        RestaurantModule.updateRestaurantListings();
    }
}

/**
 * Populate curator filter dropdown
 */
function populateCuratorFilter() {
    const curatorSelect = document.getElementById('search-curator');
    if (!curatorSelect) return;
    
    const curators = JSON.parse(localStorage.getItem('curators') || '[]');
    curatorSelect.innerHTML = '<option value="">Any Curator</option>';
    
    curators.forEach(curator => {
        const option = document.createElement('option');
        option.value = curator.id;
        option.textContent = curator.name;
        curatorSelect.appendChild(option);
    });
}

/**
 * Populate concept filter dropdown
 */
function populateConceptFilter() {
    const conceptSelect = document.getElementById('search-concept');
    if (!conceptSelect) return;
    
    const concepts = JSON.parse(localStorage.getItem('concepts') || '[]');
    
    // Group concepts by category
    const conceptsByCategory = concepts.reduce((acc, concept) => {
        if (!acc[concept.category]) {
            acc[concept.category] = [];
        }
        acc[concept.category].push(concept);
        return acc;
    }, {});
    
    conceptSelect.innerHTML = '<option value="">Any Concept</option>';
    
    // Create option groups for each category
    Object.entries(conceptsByCategory).forEach(([category, categoryConcepts]) => {
        const optgroup = document.createElement('optgroup');
        optgroup.label = category;
        
        categoryConcepts.forEach(concept => {
            const option = document.createElement('option');
            option.value = concept.id;
            option.textContent = concept.value;
            optgroup.appendChild(option);
        });
        
        conceptSelect.appendChild(optgroup);
    });
}

/**
 * Update restaurant status count in dashboard
 * Call this after restaurant status changes
 */
function updateRestaurantStatusCounts() {
    const restaurants = JSON.parse(localStorage.getItem('restaurants') || '[]');
    
    // Count by status
    const statusCounts = restaurants.reduce((acc, restaurant) => {
        const status = restaurant.status || 'draft'; // Default to draft
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {});
    
    // Update UI if elements exist
    const statuses = ['draft', 'revised', 'production', 'archived'];
    statuses.forEach(status => {
        const count = statusCounts[status] || 0;
        const element = document.getElementById(`${status}-count`);
        if (element) element.textContent = count;
    });
    
    // Update total count
    const totalElement = document.getElementById('restaurant-total');
    if (totalElement) totalElement.textContent = restaurants.length;
}

// Make updateRestaurantStatusCounts available to other modules
window.updateRestaurantStatusCounts = updateRestaurantStatusCounts;
