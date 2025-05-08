/**
 * Restaurant Module - Handles restaurant listings, viewing, editing, and deletion
 * Dependencies: UIModule for toast notifications, DataModule for data operations, StorageModule for image handling
 */

const RestaurantModule = (function() {
    // Restaurant status constants
    const STATUS = {
        DRAFT: 'draft',
        REVISED: 'revised',
        PRODUCTION: 'production',
        ARCHIVED: 'archived'
    };
    
    // Pagination state
    let currentPage = 1;
    let itemsPerPage = 12; // Default items per page
    let totalItems = 0;
    let totalPages = 0;

    /**
     * Initialize restaurant functionality
     */
    function init() {
        initRestaurantListings();
        initViewModes();
        initPagination();
    }
    
    /**
     * Initialize view mode toggles
     */
    function initViewModes() {
        const viewButtons = document.querySelectorAll('.view-toggle-btn');
        if (viewButtons && viewButtons.length >= 3) {
            const listContainer = document.getElementById('restaurant-list');
            
            // Grid view
            viewButtons[0].addEventListener('click', function() {
                setViewMode('grid', viewButtons, listContainer);
            });
            
            // List view
            viewButtons[1].addEventListener('click', function() {
                setViewMode('list', viewButtons, listContainer);
            });
            
            // Table view
            viewButtons[2].addEventListener('click', function() {
                setViewMode('table', viewButtons, listContainer);
            });
            
            // Set the default view mode or restore from preference
            const savedViewMode = localStorage.getItem('restaurantViewMode') || 'grid';
            const buttonIndex = savedViewMode === 'grid' ? 0 : (savedViewMode === 'list' ? 1 : 2);
            viewButtons[buttonIndex].click();
        }
    }
    
    /**
     * Initialize pagination controls
     */
    function initPagination() {
        // Initialize items per page from localStorage or use default
        itemsPerPage = parseInt(localStorage.getItem('restaurantItemsPerPage')) || 12;
        
        // Set up pagination controls event listeners
        document.addEventListener('click', function(event) {
            if (event.target.classList.contains('pagination-link')) {
                event.preventDefault();
                const page = parseInt(event.target.dataset.page);
                if (!isNaN(page)) {
                    goToPage(page);
                }
            }
        });
    }

    /**
     * Navigate to a specific page
     * @param {number} page - The page number to navigate to
     */
    function goToPage(page) {
        if (page < 1 || page > totalPages) return;
        
        currentPage = page;
        updateRestaurantListings();
        
        // Scroll to top of listings
        const listContainer = document.getElementById('restaurant-list');
        if (listContainer) {
            listContainer.scrollIntoView({ behavior: 'smooth' });
        }
    }

    /**
     * Generate pagination controls
     * @param {number} currentPage - Current active page
     * @param {number} totalPages - Total number of pages
     * @returns {string} - HTML for pagination controls
     */
    function generatePaginationControls(currentPage, totalPages) {
        if (totalPages <= 1) return '';
        
        let html = '<div class="pagination-controls">';
        
        // Previous button
        html += `<button class="pagination-link ${currentPage === 1 ? 'disabled' : ''}" 
                    data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>
                    <i class="fas fa-chevron-left"></i> Previous
                </button>`;
        
        // Page links
        html += '<div class="pagination-pages">';
        
        // Always show first page
        html += `<button class="pagination-link ${currentPage === 1 ? 'active' : ''}" data-page="1">1</button>`;
        
        // Show ellipsis if needed
        if (currentPage > 3) {
            html += '<span class="pagination-ellipsis">...</span>';
        }
        
        // Show pages around current page
        for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
            if (i === 1 || i === totalPages) continue; // Skip first and last as they're always shown
            html += `<button class="pagination-link ${currentPage === i ? 'active' : ''}" data-page="${i}">${i}</button>`;
        }
        
        // Show ellipsis if needed
        if (currentPage < totalPages - 2) {
            html += '<span class="pagination-ellipsis">...</span>';
        }
        
        // Always show last page if more than one page
        if (totalPages > 1) {
            html += `<button class="pagination-link ${currentPage === totalPages ? 'active' : ''}" data-page="${totalPages}">${totalPages}</button>`;
        }
        
        html += '</div>';
        
        // Next button
        html += `<button class="pagination-link ${currentPage === totalPages ? 'disabled' : ''}" 
                    data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>
                    Next <i class="fas fa-chevron-right"></i>
                </button>`;
        
        // Add items per page selector
        html += `
            <div class="items-per-page-container">
                <label for="items-per-page">Items per page:</label>
                <select id="items-per-page">
                    <option value="12" ${itemsPerPage === 12 ? 'selected' : ''}>12</option>
                    <option value="24" ${itemsPerPage === 24 ? 'selected' : ''}>24</option>
                    <option value="48" ${itemsPerPage === 48 ? 'selected' : ''}>48</option>
                    <option value="96" ${itemsPerPage === 96 ? 'selected' : ''}>96</option>
                </select>
            </div>
        `;
        
        html += '</div>';
        
        return html;
    }

    /**
     * Set view mode for restaurant listings
     * @param {string} mode - The view mode (grid, list, table)
     * @param {NodeList} buttons - The view toggle buttons
     * @param {HTMLElement} container - The restaurant list container
     */
    function setViewMode(mode, buttons, container) {
        if (!container) return;
        
        // Reset all classes
        container.classList.remove('grid-view', 'list-view', 'table-view');
        container.classList.add(`${mode}-view`);
        
        // Update active button
        buttons.forEach(btn => btn.classList.remove('active'));
        const index = mode === 'grid' ? 0 : (mode === 'list' ? 1 : 2);
        buttons[index].classList.add('active');
        
        // Store preference
        localStorage.setItem('restaurantViewMode', mode);
        
        // Refresh the listing to match the new view mode
        updateRestaurantListings();
    }

    /**
     * Initialize and manage restaurant listings view
     */
    function initRestaurantListings() {
        const restaurantListContainer = document.getElementById('restaurant-list');
        const viewModeToggle = document.querySelectorAll('.view-toggle-btn');
        const sortOptions = document.getElementById('sort-restaurants');
        const restaurantFilters = document.getElementById('filter-restaurants');
        
        // Initial load of restaurants
        updateRestaurantListings();
        
        // Handle view mode toggle (grid vs list)
        if (viewModeToggle.length >= 2) {
            // Grid view
            viewModeToggle[0].addEventListener('click', function() {
                if (restaurantListContainer) {
                    restaurantListContainer.classList.remove('list-view');
                    restaurantListContainer.classList.add('grid-view');
                    
                    // Store preference
                    localStorage.setItem('restaurantViewMode', 'grid');
                    
                    // Update active toggle button
                    viewModeToggle.forEach(btn => btn.classList.remove('active'));
                    this.classList.add('active');
                }
            });
            
            // List view
            viewModeToggle[1].addEventListener('click', function() {
                if (restaurantListContainer) {
                    restaurantListContainer.classList.remove('grid-view');
                    restaurantListContainer.classList.add('list-view');
                    
                    // Store preference
                    localStorage.setItem('restaurantViewMode', 'list');
                    
                    // Update active toggle button
                    viewModeToggle.forEach(btn => btn.classList.remove('active'));
                    this.classList.add('active');
                }
            });
            
            // Set initial view based on saved preference
            const savedViewMode = localStorage.getItem('restaurantViewMode') || 'grid';
            const initialViewBtn = savedViewMode === 'grid' ? viewModeToggle[0] : viewModeToggle[1];
            if (initialViewBtn) {
                initialViewBtn.click();
            }
        }
        
        // Handle sorting
        if (sortOptions) {
            sortOptions.addEventListener('change', function() {
                updateRestaurantListings();
            });
        }
        
        // Handle filtering
        if (restaurantFilters) {
            restaurantFilters.addEventListener('change', function() {
                updateRestaurantListings();
            });
        }
        
        // Handle bulk selection
        const selectAllCheckbox = document.getElementById('select-all-restaurants');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', function() {
                const checkboxes = document.querySelectorAll('.restaurant-select');
                checkboxes.forEach(checkbox => {
                    checkbox.checked = this.checked;
                });
                
                // Update bulk action button states
                updateBulkActionButtons();
            });
        }
        
        // Bulk action buttons
        const bulkDeleteBtn = document.getElementById('bulk-delete');
        if (bulkDeleteBtn) {
            bulkDeleteBtn.addEventListener('click', function() {
                const selectedIds = getSelectedRestaurants();
                if (selectedIds.length > 0) {
                    if (confirm(`Are you sure you want to delete ${selectedIds.length} restaurants?`)) {
                        deleteRestaurants(selectedIds);
                        updateRestaurantListings();
                        UIModule.showToast(`Deleted ${selectedIds.length} restaurants`, 'success');
                    }
                } else {
                    UIModule.showToast('Please select restaurants to delete', 'info');
                }
            });
        }

        // Add status filter handling
        const statusFilter = document.getElementById('status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', function() {
                updateRestaurantListings();
            });
        }
        
        // Update restaurant listings
        updateRestaurantListings();

        // Add items per page selector handling
        document.addEventListener('change', function(event) {
            if (event.target.id === 'items-per-page') {
                itemsPerPage = parseInt(event.target.value);
                localStorage.setItem('restaurantItemsPerPage', itemsPerPage);
                currentPage = 1; // Reset to first page when changing items per page
                updateRestaurantListings();
            }
        });
    }

    /**
     * Update the restaurant listings based on current sort, filter and view options
     * @param {Object} searchCriteria - Optional search criteria from SearchModule
     */
    function updateRestaurantListings(searchCriteria) {
        const restaurantListContainer = document.getElementById('restaurant-list');
        const paginationContainer = document.getElementById('pagination-container');
        const sortOption = document.getElementById('sort-restaurants')?.value || 'name-asc';
        const filterOption = document.getElementById('filter-restaurants')?.value || 'all';
        const statusOption = document.getElementById('status-filter')?.value || 'all';
        const viewMode = localStorage.getItem('restaurantViewMode') || 'grid';
        
        if (!restaurantListContainer) return;
        
        // Show loading state
        restaurantListContainer.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Loading restaurants...</div>';
        
        // Get restaurants data
        let restaurants = JSON.parse(localStorage.getItem('restaurants') || '[]');
        
        // Apply filters based on search criteria or standard filters
        restaurants = applyFilters(restaurants, searchCriteria, statusOption, filterOption);
        
        // Apply sort
        restaurants = applySorting(restaurants, sortOption);
        
        // Calculate pagination
        totalItems = restaurants.length;
        totalPages = Math.ceil(totalItems / itemsPerPage);
        if (currentPage > totalPages) currentPage = totalPages || 1;
        
        // Get current page of restaurants
        const startIndex = (currentPage - 1) * itemsPerPage;
        const paginatedRestaurants = restaurants.slice(startIndex, startIndex + itemsPerPage);
        
        // Update the count
        const countElement = document.getElementById('restaurant-count');
        if (countElement) {
            if (totalItems === 0) {
                countElement.textContent = 'No restaurants found';
            } else {
                countElement.textContent = `${totalItems} restaurant${totalItems !== 1 ? 's' : ''} (showing ${Math.min(startIndex + 1, totalItems)}-${Math.min(startIndex + itemsPerPage, totalItems)})`;
            }
        }
        
        // Clear the container
        restaurantListContainer.innerHTML = '';
        
        // Handle empty state
        if (paginatedRestaurants.length === 0) {
            restaurantListContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-utensils empty-icon"></i>
                    <h3>No restaurants found</h3>
                    <p>Try adjusting your filters or adding new restaurants</p>
                </div>
            `;
        } 
        // Handle table view
        else if (viewMode === 'table') {
            createTableView(restaurantListContainer, paginatedRestaurants);
        } 
        // Handle grid/list view
        else {
            const promises = paginatedRestaurants.map(restaurant => createRestaurantElement(restaurant, viewMode));
            
            Promise.all(promises)
                .then(elements => {
                    elements.forEach(element => {
                        if (element) restaurantListContainer.appendChild(element);
                    });
                    updateBulkActionButtons();
                })
                .catch(error => {
                    console.error('Error creating restaurant elements:', error);
                    restaurantListContainer.innerHTML = `<div class="error-message">Error loading restaurants: ${error.message}</div>`;
                });
        }
        
        // Create pagination controls
        if (paginationContainer) {
            paginationContainer.innerHTML = generatePaginationControls(currentPage, totalPages);
        }
    }

    /**
     * Apply filters to the restaurant list
     * @param {Array} restaurants - List of restaurants
     * @param {Object} searchCriteria - Search criteria
     * @param {string} statusOption - Status filter option
     * @param {string} filterOption - General filter option
     * @returns {Array} - Filtered restaurants
     */
    function applyFilters(restaurants, searchCriteria, statusOption, filterOption) {
        let filtered = [...restaurants];
        
        // Apply search criteria if provided
        if (searchCriteria) {
            // Text search
            if (searchCriteria.text) {
                const searchText = searchCriteria.text.toLowerCase();
                filtered = filtered.filter(r => 
                    r.name.toLowerCase().includes(searchText) || 
                    (r.description && r.description.toLowerCase().includes(searchText)) ||
                    (r.transcription && r.transcription.toLowerCase().includes(searchText))
                );
            }
            
            // Concept filter
            if (searchCriteria.conceptId) {
                const restaurantConcepts = JSON.parse(localStorage.getItem('restaurantConcepts') || '[]');
                const restaurantIds = restaurantConcepts
                    .filter(rc => rc.conceptId == searchCriteria.conceptId)
                    .map(rc => rc.restaurantId);
                
                filtered = filtered.filter(r => restaurantIds.includes(r.id));
            }
            
            // Status filter
            if (searchCriteria.statuses && searchCriteria.statuses.length > 0) {
                filtered = filtered.filter(r => {
                    const status = r.status || STATUS.DRAFT;
                    return searchCriteria.statuses.includes(status);
                });
            }
            
            // Curator filter
            if (searchCriteria.curatorId) {
                filtered = filtered.filter(r => r.curatorId == searchCriteria.curatorId);
            }
            
            // Date range
            if (searchCriteria.dateFrom || searchCriteria.dateTo) {
                const fromDate = searchCriteria.dateFrom ? new Date(searchCriteria.dateFrom) : null;
                const toDate = searchCriteria.dateTo ? new Date(searchCriteria.dateTo) : null;
                
                filtered = filtered.filter(r => {
                    const restaurantDate = new Date(r.timestamp);
                    let matches = true;
                    
                    if (fromDate) {
                        matches = matches && restaurantDate >= fromDate;
                    }
                    
                    if (toDate) {
                        const endDate = new Date(toDate);
                        endDate.setHours(23, 59, 59, 999);
                        matches = matches && restaurantDate <= endDate;
                    }
                    
                    return matches;
                });
            }
            
            // Content filters
            if (searchCriteria.hasDescription) {
                filtered = filtered.filter(r => r.description && r.description.trim() !== '');
            }
            
            if (searchCriteria.hasTranscription) {
                filtered = filtered.filter(r => r.transcription && r.transcription.trim() !== '');
            }
            
            if (searchCriteria.hasImages) {
                const photos = JSON.parse(localStorage.getItem('restaurantPhotos') || '[]');
                const restaurantsWithImages = new Set(photos.map(p => p.restaurantId));
                filtered = filtered.filter(r => restaurantsWithImages.has(r.id));
            }
            
            if (searchCriteria.hasLocation) {
                const locations = JSON.parse(localStorage.getItem('restaurantLocations') || '[]');
                const restaurantsWithLocation = new Set(locations.map(l => l.restaurantId));
                filtered = filtered.filter(r => restaurantsWithLocation.has(r.id));
            }
        }
        // Apply standard filters if no search criteria provided
        else {
            // Status filter
            if (statusOption !== 'all') {
                filtered = filtered.filter(r => {
                    const status = r.status || STATUS.DRAFT;
                    return status === statusOption;
                });
            }
            
            // General filters
            if (filterOption === 'no-concepts') {
                const restaurantConcepts = JSON.parse(localStorage.getItem('restaurantConcepts') || '[]');
                const restaurantsWithConcepts = new Set(restaurantConcepts.map(rc => rc.restaurantId));
                filtered = filtered.filter(r => !restaurantsWithConcepts.has(r.id));
            } else if (filterOption === 'new') {
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                filtered = filtered.filter(r => new Date(r.timestamp) > oneWeekAgo);
            }
        }
        
        return filtered;
    }
    
    /**
     * Apply sorting to the restaurant list
     * @param {Array} restaurants - List of restaurants
     * @param {string} sortOption - Sort option
     * @returns {Array} - Sorted restaurants
     */
    function applySorting(restaurants, sortOption) {
        let sorted = [...restaurants];
        
        switch (sortOption) {
            case 'name-asc':
                sorted.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'name-desc':
                sorted.sort((a, b) => b.name.localeCompare(a.name));
                break;
            case 'date-desc':
                sorted.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                break;
            case 'date-asc':
                sorted.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                break;
            case 'curator-asc':
                sorted.sort((a, b) => {
                    const curators = JSON.parse(localStorage.getItem('curators') || '[]');
                    const curatorA = curators.find(c => c.id === a.curatorId)?.name || '';
                    const curatorB = curators.find(c => c.id === b.curatorId)?.name || '';
                    return curatorA.localeCompare(curatorB);
                });
                break;
            case 'curator-desc':
                sorted.sort((a, b) => {
                    const curators = JSON.parse(localStorage.getItem('curators') || '[]');
                    const curatorA = curators.find(c => c.id === a.curatorId)?.name || '';
                    const curatorB = curators.find(c => c.id === b.curatorId)?.name || '';
                    return curatorB.localeCompare(curatorA);
                });
                break;
        }
        
        return sorted;
    }

    /**
     * Create table view for restaurants
     * @param {HTMLElement} container - The container element
     * @param {Array} restaurants - Array of restaurant objects
     */
    function createTableView(container, restaurants) {
        // Create table element
        const table = document.createElement('table');
        table.className = 'restaurant-table';
        
        // Create header row
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th class="checkbox-cell">
                    <div class="checkbox-wrapper">
                        <input type="checkbox" id="select-all-restaurants">
                        <label for="select-all-restaurants" class="custom-checkbox"></label>
                    </div>
                </th>
                <th class="sortable name-cell" data-sort="name">
                    <div class="th-content">
                        Restaurant Name
                        <span class="sort-icon"><i class="fas fa-sort"></i></span>
                    </div>
                </th>
                <th class="status-cell">Status</th>
                <th class="sortable" data-sort="curator">
                    <div class="th-content">
                        Curator
                        <span class="sort-icon"><i class="fas fa-sort"></i></span>
                    </div>
                </th>
                <th class="sortable date-cell" data-sort="date">
                    <div class="th-content">
                        Date Added
                        <span class="sort-icon"><i class="fas fa-sort"></i></span>
                    </div>
                </th>
                <th class="concepts-cell">Concepts</th>
                <th class="actions-cell">Actions</th>
            </tr>
        `;
        table.appendChild(thead);
        
        // Create table body
        const tbody = document.createElement('tbody');
        
        // Setup select all functionality
        const selectAllCheckbox = thead.querySelector('#select-all-restaurants');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', function() {
                const checkboxes = tbody.querySelectorAll('.restaurant-select');
                checkboxes.forEach(checkbox => {
                    checkbox.checked = this.checked;
                });
                
                updateBulkActionButtons();
            });
        }
        
        // Add click handlers for sortable headers
        const sortableHeaders = thead.querySelectorAll('th.sortable');
        sortableHeaders.forEach(header => {
            header.addEventListener('click', function() {
                const sortField = this.dataset.sort;
                const currentSort = document.getElementById('sort-restaurants').value;
                let newSort;
                
                switch (sortField) {
                    case 'name':
                        newSort = currentSort === 'name-asc' ? 'name-desc' : 'name-asc';
                        break;
                    case 'curator':
                        newSort = currentSort === 'curator-asc' ? 'curator-desc' : 'curator-asc';
                        break;
                    case 'date':
                        newSort = currentSort === 'date-asc' ? 'date-desc' : 'date-asc';
                        break;
                }
                
                document.getElementById('sort-restaurants').value = newSort;
                updateRestaurantListings();
            });
        });
        
        // Create rows for each restaurant
        const curators = JSON.parse(localStorage.getItem('curators') || '[]');
        const conceptsData = JSON.parse(localStorage.getItem('concepts') || '[]');
        const restaurantConcepts = JSON.parse(localStorage.getItem('restaurantConcepts') || '[]');
        
        if (restaurants.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.className = 'empty-row';
            emptyRow.innerHTML = `
                <td colspan="7">
                    <div class="empty-state">
                        <i class="fas fa-utensils empty-icon"></i>
                        <h3>No restaurants found</h3>
                        <p>Try adjusting your filters or adding new restaurants</p>
                    </div>
                </td>
            `;
            tbody.appendChild(emptyRow);
        } else {
            restaurants.forEach(restaurant => {
                const row = document.createElement('tr');
                
                // Find curator
                const curator = curators.find(c => c.id === restaurant.curatorId);
                
                // Get concepts for this restaurant
                const conceptIds = restaurantConcepts
                    .filter(rc => rc.restaurantId === restaurant.id)
                    .map(rc => rc.conceptId);
                
                const concepts = conceptsData
                    .filter(c => conceptIds.includes(c.id))
                    .slice(0, 3); // Limit to first 3 concepts in table view for space
                
                const conceptsHtml = concepts.length > 0 
                    ? concepts.map(concept => 
                        `<span class="concept-tag ${concept.category.toLowerCase()}" title="${concept.value}">${concept.value}</span>`
                      ).join('')
                    : '<span class="no-concepts">No concepts</span>';
                
                const conceptsWithMore = conceptIds.length > 3
                    ? conceptsHtml + `<span class="concept-more">+${conceptIds.length - 3}</span>`
                    : conceptsHtml;
                
                // Get status badge
                const status = restaurant.status || STATUS.DRAFT;
                
                row.innerHTML = `
                    <td class="checkbox-cell">
                        <div class="checkbox-wrapper">
                            <input type="checkbox" class="restaurant-select" id="restaurant-${restaurant.id}" value="${restaurant.id}">
                            <label for="restaurant-${restaurant.id}" class="custom-checkbox"></label>
                        </div>
                    </td>
                    <td class="name-cell">
                        <div class="restaurant-name-container" title="${restaurant.name}">
                            ${restaurant.name}
                        </div>
                    </td>
                    <td class="status-cell"><span class="status-badge ${status}">${status}</span></td>
                    <td>${curator ? curator.name : 'Unknown'}</td>
                    <td class="date-cell">${new Date(restaurant.timestamp).toLocaleDateString()}</td>
                    <td class="concepts-cell">${conceptsWithMore}</td>
                    <td class="actions-cell">
                        <div class="table-actions">
                            <button class="btn btn-icon view-restaurant" data-id="${restaurant.id}" title="View Details">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-icon edit-restaurant" data-id="${restaurant.id}" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-icon delete-restaurant" data-id="${restaurant.id}" title="Delete">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                            <div class="dropdown">
                                <button class="btn btn-icon dropdown-toggle" title="More actions">
                                    <i class="fas fa-ellipsis-v"></i>
                                </button>
                                <div class="dropdown-menu">
                                    <a href="#" class="duplicate-restaurant" data-id="${restaurant.id}">Duplicate</a>
                                    <a href="#" class="export-restaurant" data-id="${restaurant.id}">Export</a>
                                </div>
                            </div>
                        </div>
                    </td>
                `;
                
                // Add event listeners to action buttons
                const viewBtn = row.querySelector('.view-restaurant');
                if (viewBtn) {
                    viewBtn.addEventListener('click', function() {
                        viewRestaurantDetails(parseInt(this.dataset.id));
                    });
                }
                
                const editBtn = row.querySelector('.edit-restaurant');
                if (editBtn) {
                    editBtn.addEventListener('click', function() {
                        editRestaurant(parseInt(this.dataset.id));
                    });
                }
                
                const deleteBtn = row.querySelector('.delete-restaurant');
                if (deleteBtn) {
                    deleteBtn.addEventListener('click', function() {
                        if (confirm(`Are you sure you want to delete "${restaurant.name}"?`)) {
                            deleteRestaurants([parseInt(this.dataset.id)]);
                            updateRestaurantListings();
                            UIModule.showToast('Restaurant deleted', 'success');
                        }
                    });
                }
                
                const checkbox = row.querySelector('.restaurant-select');
                if (checkbox) {
                    checkbox.addEventListener('change', updateBulkActionButtons);
                }
                
                // Add dropdown toggle functionality
                const dropdownToggle = row.querySelector('.dropdown-toggle');
                if (dropdownToggle) {
                    dropdownToggle.addEventListener('click', function(e) {
                        e.stopPropagation();
                        const dropdown = this.nextElementSibling;
                        dropdown.classList.toggle('show');
                        
                        // Close other open dropdowns
                        document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
                            if (menu !== dropdown) menu.classList.remove('show');
                        });
                    });
                }
                
                tbody.appendChild(row);
            });
        }
        
        table.appendChild(tbody);
        container.appendChild(table);
        
        // Add document click handler to close dropdowns
        document.addEventListener('click', function() {
            document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
                menu.classList.remove('show');
            });
        });
    }

    /**
     * Create a DOM element for a restaurant
     * @param {Object} restaurant - The restaurant data
     * @param {string} viewMode - The current view mode (grid/list)
     * @return {Promise<HTMLElement>} - The restaurant element
     */
    async function createRestaurantElement(restaurant, viewMode) {
        const element = document.createElement('div');
        element.className = 'restaurant-item';
        
        // Get curator
        const curators = JSON.parse(localStorage.getItem('curators') || '[]');
        const curator = curators.find(c => c.id === restaurant.curatorId);
        
        // Get concepts for this restaurant
        const restaurantConcepts = JSON.parse(localStorage.getItem('restaurantConcepts') || '[]');
        const concepts = JSON.parse(localStorage.getItem('concepts') || '[]');
        
        const restaurantConceptIds = restaurantConcepts
            .filter(rc => rc.restaurantId === restaurant.id)
            .map(rc => rc.conceptId);
            
        const restaurantConceptsData = concepts
            .filter(c => restaurantConceptIds.includes(c.id))
            .slice(0, 4); // Show only first 4 concepts in the card
        
        // Create concept tags HTML
        const conceptsHtml = restaurantConceptsData.length > 0
            ? '<div class="restaurant-concepts">' + 
              restaurantConceptsData.map(c => `<span class="concept-tag ${c.category.toLowerCase()}" title="${c.value}">${c.value}</span>`).join('') +
              (restaurantConceptIds.length > 4 ? `<span class="concept-more">+${restaurantConceptIds.length - 4}</span>` : '') +
              '</div>'
            : '<div class="restaurant-concepts empty">No concepts assigned</div>';
            
        // Get status badge
        const status = restaurant.status || STATUS.DRAFT;

        // Try to get a restaurant image
        let imageHtml = '';
        try {
            const images = await StorageModule.getRestaurantImages(restaurant.id);
            if (images && images.length > 0) {
                const imageUrl = await StorageModule.getImageURL(images[0].id);
                if (imageUrl) {
                    imageHtml = `
                        <div class="restaurant-image">
                            <img src="${imageUrl}" alt="${restaurant.name}" loading="lazy">
                            <div class="image-overlay">
                                <i class="fas fa-images"></i>
                                <span>${images.length}</span>
                            </div>
                        </div>
                    `;
                }
            } else {
                imageHtml = `
                    <div class="restaurant-image placeholder">
                        <div class="placeholder-icon">
                            <i class="fas fa-utensils"></i>
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            console.warn('Could not load restaurant image:', error);
            imageHtml = `
                <div class="restaurant-image placeholder">
                    <div class="placeholder-icon">
                        <i class="fas fa-utensils"></i>
                    </div>
                </div>
            `;
        }
        
        // Restaurant card HTML - modern design with better organization
        element.innerHTML = `
            <div class="restaurant-card">
                <div class="restaurant-header">
                    <div class="checkbox-wrapper">
                        <input type="checkbox" class="restaurant-select" id="card-restaurant-${restaurant.id}" value="${restaurant.id}">
                        <label for="card-restaurant-${restaurant.id}" class="custom-checkbox"></label>
                    </div>
                    <div class="restaurant-title">
                        <h3 title="${restaurant.name}">${restaurant.name}</h3>
                        <span class="status-badge ${status}">${status}</span>
                    </div>
                </div>
                ${imageHtml}
                <div class="restaurant-details">
                    <div class="restaurant-meta">
                        <div class="meta-item">
                            <i class="fas fa-calendar-alt"></i>
                            <span>${new Date(restaurant.timestamp).toLocaleDateString()}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-user-circle"></i>
                            <span>${curator ? curator.name : 'Unknown'}</span>
                        </div>
                    </div>
                    
                    ${restaurant.description ? 
                        `<p class="restaurant-description">${restaurant.description.substring(0, 140)}${restaurant.description.length > 140 ? '...' : ''}</p>` 
                        : '<p class="restaurant-description empty">No description available</p>'}
                    
                    ${conceptsHtml}
                </div>
                <div class="restaurant-actions">
                    <button class="btn btn-primary view-restaurant" data-id="${restaurant.id}">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                    <div class="action-buttons">
                        <button class="btn btn-icon edit-restaurant" data-id="${restaurant.id}" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-icon delete-restaurant" data-id="${restaurant.id}" title="Delete">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Add event listeners
        const viewBtn = element.querySelector('.view-restaurant');
        if (viewBtn) {
            viewBtn.addEventListener('click', function() {
                viewRestaurantDetails(parseInt(this.dataset.id));
            });
        }
        
        const editBtn = element.querySelector('.edit-restaurant');
        if (editBtn) {
            editBtn.addEventListener('click', function() {
                editRestaurant(parseInt(this.dataset.id));
            });
        }
        
        const deleteBtn = element.querySelector('.delete-restaurant');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', function() {
                if (confirm(`Are you sure you want to delete "${restaurant.name}"?`)) {
                    deleteRestaurants([parseInt(this.dataset.id)]);
                    updateRestaurantListings();
                    UIModule.showToast('Restaurant deleted', 'success');
                }
            });
        }
        
        const checkbox = element.querySelector('.restaurant-select');
        if (checkbox) {
            checkbox.addEventListener('change', updateBulkActionButtons);
        }
        
        return element;
    }

    /**
     * Update the state of bulk action buttons based on selections
     */
    function updateBulkActionButtons() {
        const selectedCount = document.querySelectorAll('.restaurant-select:checked').length;
        const bulkActionButtons = document.querySelectorAll('.bulk-action-btn');
        
        bulkActionButtons.forEach(button => {
            if (selectedCount > 0) {
                button.disabled = false;
                button.classList.remove('disabled');
            } else {
                button.disabled = true;
                button.classList.add('disabled');
            }
        });
        
        // Update counter and show/hide selection info
        const selectionInfo = document.querySelector('.selection-info');
        const selectedCounter = document.getElementById('selected-count');
        
        if (selectionInfo && selectedCounter) {
            selectedCounter.textContent = selectedCount;
            
            if (selectedCount > 0) {
                selectionInfo.classList.add('active');
            } else {
                selectionInfo.classList.remove('active');
            }
        }
    }

    /**
     * View restaurant details
     * @param {number} restaurantId - The ID of the restaurant
     */
    async function viewRestaurantDetails(restaurantId) {
        // Navigate to restaurant detail section
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        
        const detailSection = document.getElementById('restaurant-detail');
        if (detailSection) {
            detailSection.classList.add('active');
            
            // Update page title
            const pageTitle = document.getElementById('page-title');
            if (pageTitle) pageTitle.textContent = 'Restaurant Details';
            
            // Show loading state
            detailSection.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Loading restaurant details...</div>';
            
            // Get restaurant data
            const restaurants = JSON.parse(localStorage.getItem('restaurants') || '[]');
            const restaurant = restaurants.find(r => r.id === restaurantId);
            
            if (!restaurant) {
                detailSection.innerHTML = '<div class="error-state">Restaurant not found</div>';
                return;
            }
            
            // Get associated data
            const curators = JSON.parse(localStorage.getItem('curators') || '[]');
            const curator = curators.find(c => c.id === restaurant.curatorId);
            
            const restaurantConcepts = JSON.parse(localStorage.getItem('restaurantConcepts') || '[]');
            const concepts = JSON.parse(localStorage.getItem('concepts') || '[]');
            
            const conceptsByCategory = groupConceptsByCategory(restaurantId, restaurantConcepts, concepts);
            
            // Get restaurant location
            const locations = JSON.parse(localStorage.getItem('restaurantLocations') || '[]');
            const location = locations.find(l => l.restaurantId === restaurantId);
            
            // Get images
            let galleryHtml = '<p>No images available</p>';
            try {
                const images = await StorageModule.getRestaurantImages(restaurantId);
                if (images && images.length > 0) {
                    galleryHtml = '<div class="image-gallery">';
                    
                    for (const image of images) {
                        const imageUrl = await StorageModule.getImageURL(image.id);
                        if (imageUrl) {
                            galleryHtml += `
                                <div class="gallery-item">
                                    <img src="${imageUrl}" alt="${restaurant.name}">
                                </div>
                            `;
                        }
                    }
                    
                    galleryHtml += '</div>';
                }
            } catch (error) {
                console.warn('Could not load restaurant images:', error);
                galleryHtml = `<p class="error-message">Error loading images: ${error.message}</p>`;
            }
            
            // Create status controls
            const currentStatus = restaurant.status || STATUS.DRAFT;
            const statusControls = `
                <div class="status-controls">
                    <span class="status-label">Status:</span>
                    <button class="status-btn ${currentStatus === STATUS.DRAFT ? 'active' : ''}" data-status="${STATUS.DRAFT}">Draft</button>
                    <button class="status-btn ${currentStatus === STATUS.REVISED ? 'active' : ''}" data-status="${STATUS.REVISED}">Revised</button>
                    <button class="status-btn ${currentStatus === STATUS.PRODUCTION ? 'active' : ''}" data-status="${STATUS.PRODUCTION}">Production</button>
                    <button class="status-btn ${currentStatus === STATUS.ARCHIVED ? 'active' : ''}" data-status="${STATUS.ARCHIVED}">Archived</button>
                </div>
            `;
            
            // Render concepts by category
            let conceptsHtml = '<p>No concepts associated with this restaurant</p>';
            
            if (Object.keys(conceptsByCategory).length > 0) {
                conceptsHtml = '<div class="concepts-by-category">';
                
                for (const category in conceptsByCategory) {
                    conceptsHtml += `
                        <div class="concept-group">
                            <h4 class="concept-category">${category}</h4>
                            <div class="concept-tags">
                                ${conceptsByCategory[category].map(concept => 
                                    `<span class="concept-tag">${concept.value}</span>`
                                ).join('')}
                            </div>
                        </div>
                    `;
                }
                
                conceptsHtml += '</div>';
            }
            
            // Render location information
            let locationHtml = '<p>No location information available</p>';
            
            if (location) {
                locationHtml = `
                    <div class="location-info">
                        <div class="location-map">
                            <i class="fas fa-map-marker-alt"></i> Map Placeholder (${location.latitude}, ${location.longitude})
                        </div>
                        ${location.address ? `<p class="location-address">${location.address}</p>` : ''}
                    </div>
                `;
            }
            
            // Build detailed view
            detailSection.innerHTML = `
                <div class="restaurant-detail-header">
                    <div class="title-group">
                        <button class="btn btn-icon back-to-list">
                            <i class="fas fa-arrow-left"></i>
                        </button>
                        <h2>${restaurant.name}</h2>
                        <span class="status-badge ${currentStatus}">${currentStatus}</span>
                    </div>
                    <div class="detail-actions">
                        <button class="btn btn-secondary edit-restaurant-btn" data-id="${restaurant.id}">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                    </div>
                </div>
                
                <div class="restaurant-metadata">
                    <div class="metadata-item">
                        <i class="fas fa-user"></i>
                        <span>Added by: ${curator ? curator.name : 'Unknown'}</span>
                    </div>
                    <div class="metadata-item">
                        <i class="fas fa-calendar"></i>
                        <span>Added on: ${new Date(restaurant.timestamp).toLocaleString()}</span>
                    </div>
                </div>
                
                <div class="restaurant-detail-content">
                    <div class="restaurant-detail-main">
                        <div class="detail-card">
                            <h3>Description</h3>
                            ${restaurant.description ? 
                                `<p>${restaurant.description}</p>` : 
                                '<p class="empty-message">No description available</p>'}
                        </div>
                        
                        <div class="detail-card">
                            <h3>Transcription</h3>
                            ${restaurant.transcription ? 
                                `<div class="transcription-card">${restaurant.transcription}</div>` : 
                                '<p class="empty-message">No transcription available</p>'}
                        </div>
                        
                        <div class="detail-card">
                            <h3>Images</h3>
                            ${galleryHtml}
                        </div>
                    </div>
                    
                    <div class="restaurant-detail-sidebar">
                        <div class="detail-card">
                            <h3>Status</h3>
                            ${statusControls}
                        </div>
                        
                        <div class="detail-card">
                            <h3>Location</h3>
                            ${locationHtml}
                        </div>
                        
                        <div class="detail-card">
                            <h3>Concepts</h3>
                            ${conceptsHtml}
                        </div>
                    </div>
                </div>
            `;
            
            // Add event listeners
            const backButton = detailSection.querySelector('.back-to-list');
            if (backButton) {
                backButton.addEventListener('click', function() {
                    // Go back to restaurant list
                    document.querySelectorAll('.content-section').forEach(section => {
                        section.classList.remove('active');
                    });
                    
                    const restaurantsSection = document.getElementById('restaurants');
                    if (restaurantsSection) {
                        restaurantsSection.classList.add('active');
                        
                        // Update page title
                        const pageTitle = document.getElementById('page-title');
                        if (pageTitle) pageTitle.textContent = 'Restaurants';
                    }
                });
            }
            
            const editButton = detailSection.querySelector('.edit-restaurant-btn');
            if (editButton) {
                editButton.addEventListener('click', function() {
                    editRestaurant(parseInt(this.dataset.id));
                });
            }
            
            // Add status button listeners
            const statusButtons = detailSection.querySelectorAll('.status-btn');
            statusButtons.forEach(button => {
                button.addEventListener('click', function() {
                    const newStatus = this.dataset.status;
                    updateRestaurantStatus(restaurant.id, newStatus);
                    
                    // Update UI
                    statusButtons.forEach(btn => btn.classList.remove('active'));
                    this.classList.add('active');
                    
                    const statusBadge = detailSection.querySelector('.status-badge');
                    if (statusBadge) {
                        statusBadge.className = `status-badge ${newStatus}`;
                        statusBadge.textContent = newStatus;
                    }
                    
                    UIModule.showToast(`Restaurant status updated to ${newStatus}`, 'success');
                });
            });
        }
    }

    /**
     * Group concepts by category for a restaurant
     * @param {number} restaurantId - The restaurant ID
     * @param {Array} restaurantConcepts - Array of restaurant-concept relationships
     * @param {Array} allConcepts - Array of all concepts
     * @return {Object} - Object with category keys and arrays of concepts as values
     */
    function groupConceptsByCategory(restaurantId, restaurantConcepts, allConcepts) {
        const result = {};
        
        // Get concept IDs for this restaurant
        const conceptIds = restaurantConcepts
            .filter(rc => rc.restaurantId === restaurantId)
            .map(rc => rc.conceptId);
        
        // Get actual concept objects
        const concepts = allConcepts.filter(c => conceptIds.includes(c.id));
        
        // Group by category
        concepts.forEach(concept => {
            if (!result[concept.category]) {
                result[concept.category] = [];
            }
            result[concept.category].push(concept);
        });
        
        return result;
    }

    /**
     * Update a restaurant's status
     * @param {number} restaurantId - The restaurant ID to update
     * @param {string} newStatus - The new status
     */
    function updateRestaurantStatus(restaurantId, newStatus) {
        const restaurants = JSON.parse(localStorage.getItem('restaurants') || '[]');
        const index = restaurants.findIndex(r => r.id === restaurantId);
        
        if (index !== -1) {
            restaurants[index].status = newStatus;
            localStorage.setItem('restaurants', JSON.stringify(restaurants));
        }
    }

    /**
     * Initialize restaurant editing functionality
     * @param {number} restaurantId - The ID of the restaurant to edit
     */
    function editRestaurant(restaurantId) {
        // Implementation details omitted for brevity
        UIModule.showToast('Edit functionality not yet implemented', 'info');
    }

    /**
     * Delete restaurants by ID
     * @param {Array} restaurantIds - Array of restaurant IDs to delete
     */
    async function deleteRestaurants(restaurantIds) {
        if (!Array.isArray(restaurantIds) || restaurantIds.length === 0) return;
        
        try {
            // Delete restaurant images from storage
            await StorageModule.deleteRestaurantImages(restaurantIds);
            
            // Delete from restaurants
            let restaurants = JSON.parse(localStorage.getItem('restaurants') || '[]');
            restaurants = restaurants.filter(r => !restaurantIds.includes(r.id));
            localStorage.setItem('restaurants', JSON.stringify(restaurants));
            
            // Delete related restaurant concepts
            let restaurantConcepts = JSON.parse(localStorage.getItem('restaurantConcepts') || '[]');
            restaurantConcepts = restaurantConcepts.filter(rc => !restaurantIds.includes(rc.restaurantId));
            localStorage.setItem('restaurantConcepts', JSON.stringify(restaurantConcepts));
            
            // Delete related locations
            let locations = JSON.parse(localStorage.getItem('restaurantLocations') || '[]');
            locations = locations.filter(l => !restaurantIds.includes(l.restaurantId));
            localStorage.setItem('restaurantLocations', JSON.stringify(locations));
            
            // Delete related photo references
            let photos = JSON.parse(localStorage.getItem('restaurantPhotos') || '[]');
            photos = photos.filter(p => !restaurantIds.includes(p.restaurantId));
            localStorage.setItem('restaurantPhotos', JSON.stringify(photos));
        } catch (error) {
            console.error('Error deleting restaurants:', error);
            UIModule.showToast('Error deleting restaurant data', 'error');
        }
    }

    /**
     * Get selected restaurants from the UI
     * @return {Array} - Array of selected restaurant IDs
     */
    function getSelectedRestaurants() {
        const selectedCheckboxes = document.querySelectorAll('.restaurant-select:checked');
        return Array.from(selectedCheckboxes).map(cb => parseInt(cb.value));
    }

    // Public API
    return {
        init: init,
        updateRestaurantListings: updateRestaurantListings,
        viewRestaurantDetails: viewRestaurantDetails,
        editRestaurant: editRestaurant,
        deleteRestaurants: deleteRestaurants,
        getSelectedRestaurants: getSelectedRestaurants,
        goToPage: goToPage
    };
})();
