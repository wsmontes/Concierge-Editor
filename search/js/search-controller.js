/**
 * search-controller.js
 * 
 * Purpose: Coordinates the search view, manages UI interactions and result display
 * Initializes and orchestrates search components and filters
 * 
 * Dependencies:
 *   - search-service.js - For data access and search functionality
 *   - search-tools.js - For search query management
 *   - table-view.js - For displaying search results in a table format
 */

document.addEventListener('DOMContentLoaded', async function() {
    // Search state
    const state = {
        searchType: 'restaurants',
        keyword: '',
        currentPage: 1,
        resultsPerPage: 10,
        sortField: 'name',
        sortDirection: 'asc',
        filters: {}
    };

    // Initialize reference to table view
    let tableView = null;

    /**
     * Initializes the database connection
     */
    async function initializeDatabase() {
        try {
            const dbStatus = document.getElementById('dbStatus');
            dbStatus.textContent = 'Connecting...';
            
            await ConciergeData.initialize();
            
            dbStatus.textContent = 'Connected';
            dbStatus.classList.add('connected');
            
            // Once connected, initialize search UI
            await initializeSearchUI();
        } catch (error) {
            console.error('Database initialization error:', error);
            const dbStatus = document.getElementById('dbStatus');
            dbStatus.textContent = `Error: ${error.message}`;
            dbStatus.classList.add('error');
            
            document.getElementById('statusMessage').textContent = 
                `Error initializing database: ${error.message}`;
            
            document.getElementById('resultsMessage').textContent =
                'Database connection error. Please check your browser console for details.';
        }
    }

    /**
     * Initializes the search UI components
     */
    async function initializeSearchUI() {
        try {
            // Load filter options
            await loadFilterOptions();
            
            // Initialize the table view
            tableView = new TableView('resultsTable');
            
            // Hide the loader
            document.getElementById('resultsLoader').style.display = 'none';
            
            // Show the message
            document.getElementById('resultsMessage').style.display = 'block';
        } catch (error) {
            console.error('Error initializing search UI:', error);
            document.getElementById('resultsMessage').textContent = 
                `Error initializing search UI: ${error.message}`;
        }
    }

    /**
     * Loads filter options for dropdowns
     */
    async function loadFilterOptions() {
        try {
            // Show loading state or use cached data
            const options = await SearchService.loadFilterOptions();
            
            // Populate curator dropdown
            const curatorSelect = document.getElementById('curatorFilter');
            curatorSelect.innerHTML = '<option value="">Any curator</option>';
            
            if (options.curators && options.curators.length > 0) {
                options.curators.forEach(curator => {
                    const option = document.createElement('option');
                    option.value = curator.id;
                    option.textContent = curator.name || `Curator #${curator.id}`;
                    curatorSelect.appendChild(option);
                });
            }
            
            // Populate category dropdown
            const categorySelect = document.getElementById('categoryFilter');
            categorySelect.innerHTML = '<option value="">Any category</option>';
            
            if (options.categories && options.categories.length > 0) {
                options.categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category;
                    option.textContent = category;
                    categorySelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading filter options:', error);
            showToast(`Error loading filter options: ${error.message}`, 5000);
        }
    }

    /**
     * Performs a search operation based on current state
     */
    async function performSearch() {
        try {
            // Show loader
            document.getElementById('resultsLoader').style.display = 'block';
            document.getElementById('resultsMessage').style.display = 'none';
            
            // Build search criteria from state
            const criteria = {
                keyword: state.keyword,
                ...state.filters
            };
            
            // Perform search using SearchTools
            const results = await SearchTools.executeSearch(
                state.searchType, 
                criteria, 
                state.sortField, 
                state.sortDirection
            );
            
            // Update table view with results
            if (tableView) {
                // Configure columns based on search type
                let columns;
                
                switch (state.searchType) {
                    case 'restaurants':
                        columns = [
                            { field: 'id', title: 'ID', width: '50px' },
                            { field: 'name', title: 'Name' },
                            { field: 'curator', title: 'Curator' },
                            { field: 'conceptCount', title: 'Concepts', width: '80px' },
                            { field: 'locationCount', title: 'Locations', width: '80px' }
                        ];
                        break;
                    case 'concepts':
                        columns = [
                            { field: 'id', title: 'ID', width: '50px' },
                            { field: 'category', title: 'Category' },
                            { field: 'value', title: 'Value' },
                            { field: 'usageCount', title: 'Usage', width: '80px' }
                        ];
                        break;
                    case 'curators':
                        columns = [
                            { field: 'id', title: 'ID', width: '50px' },
                            { field: 'name', title: 'Name' },
                            { field: 'restaurantCount', title: 'Restaurants', width: '100px' },
                            { field: 'lastActive', title: 'Last Active' }
                        ];
                        break;
                    default:
                        columns = [
                            { field: 'id', title: 'ID' },
                            { field: 'name', title: 'Name' }
                        ];
                }
                
                // Implement pagination
                const paginatedResults = paginateResults(results, state.currentPage, state.resultsPerPage);
                
                // Display results in table
                tableView.render(columns, paginatedResults, {
                    sortField: state.sortField,
                    sortDirection: state.sortDirection,
                    onRowClick: handleRowClick,
                    onSort: handleSort
                });
                
                // Update pagination
                updatePagination(results.length);
                
                // Update results message
                document.getElementById('resultsMessage').style.display = 
                    results.length === 0 ? 'block' : 'none';
                
                if (results.length === 0) {
                    document.getElementById('resultsMessage').textContent = 
                        'No results match your search criteria.';
                }
            }
            
            // Hide loader
            document.getElementById('resultsLoader').style.display = 'none';
            
            // Update status message
            document.getElementById('statusMessage').textContent = 
                `Found ${results.length} ${state.searchType} matching your criteria`;
        } catch (error) {
            console.error('Error performing search:', error);
            document.getElementById('resultsLoader').style.display = 'none';
            document.getElementById('resultsMessage').style.display = 'block';
            document.getElementById('resultsMessage').textContent = 
                `Error performing search: ${error.message}`;
            
            document.getElementById('statusMessage').textContent = 
                `Error: ${error.message}`;
        }
    }

    /**
     * Paginates search results
     * @param {Array} results - All search results
     * @param {number} page - Current page
     * @param {number} perPage - Results per page
     * @returns {Array} Subset of results for current page
     */
    function paginateResults(results, page, perPage) {
        const startIndex = (page - 1) * perPage;
        return results.slice(startIndex, startIndex + perPage);
    }

    /**
     * Updates pagination controls
     * @param {number} totalResults - Total number of results
     */
    function updatePagination(totalResults) {
        const paginationEl = document.getElementById('pagination');
        paginationEl.innerHTML = '';
        
        if (totalResults === 0) return;
        
        const totalPages = Math.ceil(totalResults / state.resultsPerPage);
        
        // Create previous button
        const prevButton = document.createElement('button');
        prevButton.textContent = '« Prev';
        prevButton.disabled = state.currentPage === 1;
        prevButton.addEventListener('click', () => {
            if (state.currentPage > 1) {
                state.currentPage--;
                performSearch();
            }
        });
        paginationEl.appendChild(prevButton);
        
        // Create page buttons (showing up to 5 pages)
        let startPage = Math.max(1, state.currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        
        // Adjust if we're near the end
        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            pageButton.className = i === state.currentPage ? 'active' : '';
            pageButton.addEventListener('click', () => {
                state.currentPage = i;
                performSearch();
            });
            paginationEl.appendChild(pageButton);
        }
        
        // Create next button
        const nextButton = document.createElement('button');
        nextButton.textContent = 'Next »';
        nextButton.disabled = state.currentPage === totalPages;
        nextButton.addEventListener('click', () => {
            if (state.currentPage < totalPages) {
                state.currentPage++;
                performSearch();
            }
        });
        paginationEl.appendChild(nextButton);
    }
    
    /**
     * Handles row clicks in the results table
     * @param {Object} row - The clicked row data
     * @param {Event} event - The click event
     */
    function handleRowClick(row, event) {
        // Open the editor for the selected item
        const id = row.id;
        
        if (state.searchType === 'restaurants') {
            window.location.href = `../restaurant-editor.html?id=${id}`;
        } else {
            // For now, show toast with info
            showToast(`Selected ${state.searchType.slice(0, -1)} with ID: ${id}`);
        }
    }
    
    /**
     * Handles sorting of the results table
     * @param {string} field - The field to sort by
     * @param {string} direction - The sort direction (asc/desc)
     */
    function handleSort(field, direction) {
        state.sortField = field;
        state.sortDirection = direction;
        performSearch();
    }
    
    /**
     * Shows a toast notification message
     * @param {string} message - The message to display
     * @param {number} duration - How long to show the toast (ms)
     */
    function showToast(message, duration = 3000) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        // Show the toast
        setTimeout(() => {
            toast.style.display = 'block';
        }, 10);
        
        // Hide and remove after duration
        setTimeout(() => {
            toast.style.display = 'none';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, duration);
    }

    /**
     * Sets up event listeners for search controls
     */
    function setupEventListeners() {
        const searchButton = document.getElementById('btnSearch');
        const searchInput = document.getElementById('searchInput');
        
        // Ensure elements exist before adding event listeners
        if (searchButton) {
            searchButton.addEventListener('click', handleSearch);
        } else {
            console.error("Search button element not found");
        }
        
        if (searchInput) {
            searchInput.addEventListener('keyup', function(event) {
                if (event.key === 'Enter') {
                    handleSearch();
                }
            });
        } else {
            console.error("Search input element not found");
        }
        
        // Add additional null checks for other elements
        document.getElementById('searchType').addEventListener('change', (e) => {
            state.searchType = e.target.value;
            
            // Show/hide appropriate filter sections
            if (state.searchType === 'restaurants') {
                document.getElementById('restaurantFilters').style.display = 'block';
                document.getElementById('conceptFilters').style.display = 'none';
            } else if (state.searchType === 'concepts') {
                document.getElementById('restaurantFilters').style.display = 'none';
                document.getElementById('conceptFilters').style.display = 'block';
            } else {
                document.getElementById('restaurantFilters').style.display = 'none';
                document.getElementById('conceptFilters').style.display = 'none';
            }
            
            // Reset filters and results
            state.filters = {};
            state.currentPage = 1;
        });
        
        // Keyword search
        document.getElementById('searchKeyword').addEventListener('input', (e) => {
            state.keyword = e.target.value;
        });
        
        // Restaurant filters
        document.getElementById('conceptFilter').addEventListener('change', (e) => {
            if (e.target.value) {
                state.filters.conceptId = e.target.value;
            } else {
                delete state.filters.conceptId;
            }
        });
        
        document.getElementById('curatorFilter').addEventListener('change', (e) => {
            if (e.target.value) {
                state.filters.curatorId = e.target.value;
            } else {
                delete state.filters.curatorId;
            }
        });
        
        document.getElementById('locationFilter').addEventListener('input', (e) => {
            if (e.target.value) {
                state.filters.location = e.target.value;
            } else {
                delete state.filters.location;
            }
        });
        
        // Concept filters
        document.getElementById('categoryFilter').addEventListener('change', (e) => {
            if (e.target.value) {
                state.filters.category = e.target.value;
            } else {
                delete state.filters.category;
            }
        });
        
        // Search button
        document.getElementById('btnSearch').addEventListener('click', () => {
            state.currentPage = 1; // Reset to first page on new search
            performSearch();
        });
        
        // Clear search button
        document.getElementById('btnClearSearch').addEventListener('click', () => {
            // Reset all form inputs
            document.getElementById('searchKeyword').value = '';
            document.getElementById('conceptFilter').value = '';
            document.getElementById('curatorFilter').value = '';
            document.getElementById('locationFilter').value = '';
            document.getElementById('categoryFilter').value = '';
            
            // Reset state
            state.keyword = '';
            state.filters = {};
            state.currentPage = 1;
            
            // Clear table
            if (tableView) {
                tableView.clear();
            }
            
            // Show message
            document.getElementById('resultsMessage').style.display = 'block';
            document.getElementById('resultsMessage').textContent = 
                'Enter search criteria and click Search';
            
            // Clear pagination
            document.getElementById('pagination').innerHTML = '';
        });
        
        // Sort dropdown
        document.getElementById('resultsSort').addEventListener('change', (e) => {
            const sortOption = e.target.value;
            
            switch (sortOption) {
                case 'relevance':
                    state.sortField = 'name';
                    state.sortDirection = 'asc';
                    break;
                case 'name':
                    state.sortField = 'name';
                    state.sortDirection = 'asc';
                    break;
                case 'newest':
                    state.sortField = 'timestamp';
                    state.sortDirection = 'desc';
                    break;
            }
            
            if (tableView && tableView.hasData()) {
                performSearch();
            }
        });
        
        // Export results button
        document.getElementById('btnExportResults').addEventListener('click', exportSearchResults);
    }

    /**
     * Exports the current search results to a file
     */
    async function exportSearchResults() {
        try {
            if (!tableView || !tableView.hasData()) {
                showToast('No results to export');
                return;
            }
            
            const criteria = {
                keyword: state.keyword,
                ...state.filters
            };
            
            // Get full results (not paginated)
            const results = await SearchTools.executeSearch(
                state.searchType, 
                criteria, 
                state.sortField, 
                state.sortDirection
            );
            
            if (results.length === 0) {
                showToast('No results to export');
                return;
            }
            
            // Format the export data
            const exportData = {
                searchType: state.searchType,
                criteria: criteria,
                timestamp: new Date().toISOString(),
                results: results
            };
            
            // Export the data
            const blob = new Blob([JSON.stringify(exportData, null, 2)], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `search-results-${state.searchType}-${new Date().toISOString().slice(0,10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showToast(`Exported ${results.length} ${state.searchType} to file`);
        } catch (error) {
            console.error('Error exporting search results:', error);
            showToast(`Export error: ${error.message}`);
        }
    }

    /**
     * Initialize the search page
     */
    async function init() {
        setupEventListeners();
        await initializeDatabase();
    }

    // Ensure DOM is fully loaded before initializing
    document.addEventListener('DOMContentLoaded', function() {
        init();
    });
});
