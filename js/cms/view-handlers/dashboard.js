/**
 * dashboard.js
 * 
 * Purpose: Implements the dashboard view for the CMS, showing statistics, 
 * recent activities, and key metrics about the restaurant data.
 * 
 * Dependencies:
 *   - concierge-data.js - For data access
 *   - ui-manager.js - For UI components
 *   - Chart.js - For rendering charts and visualizations
 */

const DashboardView = (() => {
    // View state management
    const state = {
        restaurants: [],
        curators: [],
        concepts: [],
        photos: [],
        locations: [],
        relationshipData: [],
        chartInstances: {}
    };
    
    /**
     * Initializes the dashboard view
     * @param {HTMLElement} container - The container element to render the view in
     */
    const initialize = async (container) => {
        UIManager.setPageTitle('Dashboard');
        
        // Show loading state
        container.innerHTML = '';
        container.appendChild(UIManager.createLoadingSpinner());
        
        try {
            // Load dashboard data
            await loadDashboardData();
            
            // Render the dashboard
            renderDashboard(container);
            
            // Initialize chart visualizations
            initializeCharts();
            
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            container.innerHTML = '';
            container.appendChild(
                UIManager.createPlaceholder(
                    `Error loading dashboard data: ${error.message}. Please check your connection and try again.`,
                    'bi-exclamation-triangle'
                )
            );
        }
    };
    
    /**
     * Loads the data needed for the dashboard
     */
    const loadDashboardData = async () => {
        if (!ConciergeData.getDatabase().db) {
            throw new Error('Database not connected. Please initialize the database first.');
        }
        
        const restaurantModel = ConciergeData.getEntityModel('restaurant');
        if (!restaurantModel) {
            throw new Error('Restaurant model not found');
        }
        
        try {
            // Load entity data in parallel for better performance
            const [restaurants, curators, concepts, relationshipData] = await Promise.all([
                restaurantModel.restaurants.getAll(),
                restaurantModel.curators.getAll(),
                restaurantModel.concepts.getAll(),
                restaurantModel.restaurantConcepts.getAll()
            ]);
            
            // Store in state
            state.restaurants = restaurants || [];
            state.curators = curators || [];
            state.concepts = concepts || [];
            state.relationshipData = relationshipData || [];
            
            // Also load locations and photos if those operations exist
            if (restaurantModel.restaurantLocations && typeof restaurantModel.restaurantLocations.getAll === 'function') {
                state.locations = await restaurantModel.restaurantLocations.getAll() || [];
            }
            
            if (restaurantModel.restaurantPhotos && typeof restaurantModel.restaurantPhotos.getAll === 'function') {
                state.photos = await restaurantModel.restaurantPhotos.getAll() || [];
            }
            
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            throw new Error(`Failed to load data: ${error.message}`);
        }
    };
    
    /**
     * Renders the dashboard UI
     * @param {HTMLElement} container - The container element to render in
     */
    const renderDashboard = (container) => {
        container.innerHTML = `
            <div class="row mb-4">
                <div class="col-12">
                    <div class="card">
                        <div class="card-body">
                            <h2 class="card-title">Welcome to Concierge Editor</h2>
                            <p class="card-text">
                                Manage your restaurant data efficiently. Use the navigation menu to explore different sections.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="row mb-4">
                <!-- Stats cards -->
                <div class="col-md-3 mb-3">
                    <div class="card h-100 stats-card">
                        <div class="card-body">
                            <h5 class="card-title">Restaurants</h5>
                            <div class="d-flex align-items-center">
                                <i class="bi bi-shop stats-icon text-primary"></i>
                                <h2 class="mb-0 ms-3">${state.restaurants.length}</h2>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-3 mb-3">
                    <div class="card h-100 stats-card">
                        <div class="card-body">
                            <h5 class="card-title">Curators</h5>
                            <div class="d-flex align-items-center">
                                <i class="bi bi-people stats-icon text-success"></i>
                                <h2 class="mb-0 ms-3">${state.curators.length}</h2>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-3 mb-3">
                    <div class="card h-100 stats-card">
                        <div class="card-body">
                            <h5 class="card-title">Concepts</h5>
                            <div class="d-flex align-items-center">
                                <i class="bi bi-tags stats-icon text-info"></i>
                                <h2 class="mb-0 ms-3">${state.concepts.length}</h2>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-3 mb-3">
                    <div class="card h-100 stats-card">
                        <div class="card-body">
                            <h5 class="card-title">Locations</h5>
                            <div class="d-flex align-items-center">
                                <i class="bi bi-geo-alt stats-icon text-warning"></i>
                                <h2 class="mb-0 ms-3">${state.locations.length}</h2>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="row mb-4">
                <!-- Charts -->
                <div class="col-md-6 mb-4">
                    <div class="card h-100">
                        <div class="card-header">
                            <h5 class="card-title mb-0">Concepts by Category</h5>
                        </div>
                        <div class="card-body">
                            <canvas id="conceptsByCategory" height="250"></canvas>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-6 mb-4">
                    <div class="card h-100">
                        <div class="card-header">
                            <h5 class="card-title mb-0">Restaurants by Curator</h5>
                        </div>
                        <div class="card-body fixed-height-chart-container">
                            <canvas id="restaurantsByCurator"></canvas>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="row">
                <!-- Recent Items -->
                <div class="col-md-12">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="card-title mb-0">Recently Added Restaurants</h5>
                        </div>
                        <div class="card-body">
                            ${renderRecentRestaurants()}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add custom CSS for chart container height
        const style = document.createElement('style');
        style.textContent = `
            .fixed-height-chart-container {
                height: 250px;
                max-height: 250px;
                position: relative;
                overflow: hidden;
            }
        `;
        document.head.appendChild(style);
    };
    
    /**
     * Renders a table of recent restaurants
     * @returns {string} HTML for recent restaurants table
     */
    const renderRecentRestaurants = () => {
        if (state.restaurants.length === 0) {
            return `<p class="text-center">No restaurants found. Add one to get started.</p>`;
        }
        
        // Sort by timestamp (newest first) and take the first 5
        const sortedRestaurants = [...state.restaurants]
            .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
            .slice(0, 5);
        
        return `
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Curator</th>
                            <th>Added</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedRestaurants.map(restaurant => {
                            // Find curator name
                            const curator = state.curators.find(c => c.id === restaurant.curatorId);
                            const curatorName = curator ? curator.name : 'Unknown';
                            
                            // Format date
                            const date = restaurant.timestamp 
                                ? new Date(restaurant.timestamp).toLocaleDateString() 
                                : 'Unknown date';
                                
                            return `
                                <tr>
                                    <td>${restaurant.name}</td>
                                    <td>${curatorName}</td>
                                    <td>${date}</td>
                                    <td>
                                        <button class="btn btn-sm btn-outline-primary view-restaurant" data-id="${restaurant.id}">
                                            <i class="bi bi-eye"></i> View
                                        </button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    };
    
    /**
     * Initializes and renders chart visualizations
     */
    const initializeCharts = () => {
        // Clean up existing charts to avoid memory leaks
        for (const chartId in state.chartInstances) {
            if (state.chartInstances[chartId]) {
                state.chartInstances[chartId].destroy();
            }
        }
        
        // Initialize charts
        initializeConceptsByCategoryChart();
        initializeRestaurantsByCuratorChart();
        
        // Set up event listeners for chart buttons
        document.querySelectorAll('.view-restaurant').forEach(button => {
            button.addEventListener('click', () => {
                const id = parseInt(button.dataset.id);
                Router.navigateTo('restaurants', { action: 'view', id });
            });
        });
    };
    
    /**
     * Initializes the Concepts by Category chart
     */
    const initializeConceptsByCategoryChart = () => {
        const canvas = document.getElementById('conceptsByCategory');
        if (!canvas) return;
        
        // Count concepts by category
        const categoryCounts = {};
        state.concepts.forEach(concept => {
            if (!categoryCounts[concept.category]) {
                categoryCounts[concept.category] = 0;
            }
            categoryCounts[concept.category]++;
        });
        
        // Prepare data for chart
        const labels = Object.keys(categoryCounts);
        const data = Object.values(categoryCounts);
        const backgroundColors = generateColorPalette(labels.length);
        
        // Create chart
        state.chartInstances.conceptsByCategory = new Chart(canvas, {
            type: 'pie',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: backgroundColors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right'
                    }
                }
            }
        });
    };
    
    /**
     * Initializes the Restaurants by Curator chart
     */
    const initializeRestaurantsByCuratorChart = () => {
        const canvas = document.getElementById('restaurantsByCurator');
        if (!canvas) return;
        
        // Count restaurants by curator
        const curatorCounts = {};
        state.restaurants.forEach(restaurant => {
            if (!curatorCounts[restaurant.curatorId]) {
                curatorCounts[restaurant.curatorId] = 0;
            }
            curatorCounts[restaurant.curatorId]++;
        });
        
        // Map curator IDs to names
        const curatorLabels = {};
        state.curators.forEach(curator => {
            curatorLabels[curator.id] = curator.name;
        });
        
        // Prepare data for chart
        let labels = Object.keys(curatorCounts).map(id => curatorLabels[id] || `Curator #${id}`);
        let data = Object.values(curatorCounts);
        
        // If too many curators, limit display and add a "Others" category
        const MAX_DISPLAY_CURATORS = 8;
        if (labels.length > MAX_DISPLAY_CURATORS) {
            // Sort by number of restaurants (descending)
            const sortedEntries = Object.entries(curatorCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([id, count]) => ({ 
                    id, 
                    count, 
                    label: curatorLabels[id] || `Curator #${id}` 
                }));
            
            // Take top curators
            const topCurators = sortedEntries.slice(0, MAX_DISPLAY_CURATORS - 1);
            
            // Sum the rest into "Others"
            const otherCurators = sortedEntries.slice(MAX_DISPLAY_CURATORS - 1);
            const othersCount = otherCurators.reduce((sum, item) => sum + item.count, 0);
            
            // Create new arrays
            labels = topCurators.map(item => item.label);
            labels.push('Others');
            
            data = topCurators.map(item => item.count);
            data.push(othersCount);
        }
        
        // Always use horizontal bar for better display
        const isHorizontal = true;
        
        // Create chart with fixed height configuration
        state.chartInstances.restaurantsByCurator = new Chart(canvas, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Number of Restaurants',
                    data,
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                indexAxis: isHorizontal ? 'y' : 'x', 
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                return context[0].label;
                            },
                            label: function(context) {
                                return `Restaurants: ${context.raw}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            display: false
                        }
                    },
                    x: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0,
                            stepSize: 1
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    }
                },
                layout: {
                    padding: {
                        left: 10,
                        right: 10,
                        top: 0,
                        bottom: 10
                    }
                }
            }
        });
    };
    
    /**
     * Generates a color palette for charts
     * @param {number} count - Number of colors to generate
     * @returns {Array} Array of color strings
     */
    const generateColorPalette = (count) => {
        const baseColors = [
            'rgba(255, 99, 132, 0.7)',   // Red
            'rgba(54, 162, 235, 0.7)',   // Blue
            'rgba(255, 206, 86, 0.7)',   // Yellow
            'rgba(75, 192, 192, 0.7)',   // Green
            'rgba(153, 102, 255, 0.7)',  // Purple
            'rgba(255, 159, 64, 0.7)'    // Orange
        ];
        
        // If we need more colors than in our base set, we generate variations
        if (count <= baseColors.length) {
            return baseColors.slice(0, count);
        }
        
        const palette = [...baseColors];
        
        // Add more colors by varying opacity
        for (let i = 0; palette.length < count; i++) {
            const baseColor = baseColors[i % baseColors.length];
            const opacity = 0.3 + (0.6 * ((i / baseColors.length) % 1));
            const newColor = baseColor.replace(/[\d.]+\)$/, `${opacity.toFixed(1)})`);
            palette.push(newColor);
        }
        
        return palette;
    };
    
    /**
     * Cleanup when leaving the view
     */
    const onExit = () => {
        // Clean up charts
        for (const chartId in state.chartInstances) {
            if (state.chartInstances[chartId]) {
                state.chartInstances[chartId].destroy();
            }
        }
        state.chartInstances = {};
    };
    
    // Public API
    return {
        initialize,
        onExit
    };
})();
