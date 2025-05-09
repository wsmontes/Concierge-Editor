/**
 * Dashboard Module - Handles dashboard charts and analytics
 * Dependencies: Chart.js, ServiceRegistry, ErrorHandlingService
 * Provides visualizations of application statistics and analytics
 */

const DashboardModule = (function() {
    // Chart instances to allow updating later
    let restaurantChart = null;
    
    /**
     * Initialize dashboard functionality
     */
    function init() {
        initCharts();
        initPopularConcepts();
    }

    /**
     * Initialize dashboard charts
     */
    async function initCharts() {
        const visitorChartCanvas = document.getElementById('visitorChart');
        
        if (!visitorChartCanvas) return;
        
        try {
            // Show loading state
            const chartContainer = visitorChartCanvas.parentElement;
            if (chartContainer) {
                chartContainer.classList.add('loading');
                chartContainer.innerHTML = '<div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i> Loading chart data...</div>';
            }
            
            // Get analytics data from services instead of BusinessLogicModule
            const restaurantService = ServiceRegistry.getRestaurantService();
            const analyticsData = await restaurantService.getAnalytics('year');
            
            // Clear loading state
            if (chartContainer) {
                chartContainer.classList.remove('loading');
                chartContainer.innerHTML = '';
                chartContainer.appendChild(visitorChartCanvas);
            }
            
            // Create chart with the analytics data
            restaurantChart = new Chart(visitorChartCanvas, {
                type: 'line',
                data: {
                    labels: analyticsData.labels,
                    datasets: [{
                        label: 'Restaurants Added',
                        data: analyticsData.datasets[0].data,
                        borderColor: '#e74c3c',
                        backgroundColor: 'rgba(231, 76, 60, 0.1)',
                        tension: 0.3,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(0, 0, 0, 0.05)'
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            }
                        }
                    }
                }
            });
            
            // Update dashboard status counts
            updateStatusCounts(analyticsData.totals);
        } catch (error) {
            ErrorHandlingService.handleError(error, 'Loading dashboard charts');
            
            // Show error state
            const chartContainer = visitorChartCanvas.parentElement;
            if (chartContainer) {
                chartContainer.classList.remove('loading');
                chartContainer.innerHTML = '<div class="error-state">Error loading chart data</div>';
            }
        }
    }
    
    /**
     * Update the status counts display on dashboard
     * @param {Object} totals - Total counts for each status
     */
    function updateStatusCounts(totals) {
        const statusCounters = {
            'draft': document.getElementById('draft-count'),
            'revised': document.getElementById('revised-count'),
            'production': document.getElementById('production-count'),
            'archived': document.getElementById('archived-count'),
            'total': document.getElementById('total-count')
        };
        
        // Update each counter if it exists
        Object.entries(statusCounters).forEach(([status, element]) => {
            if (element) {
                if (status === 'total') {
                    element.textContent = totals.restaurants || 0;
                } else {
                    element.textContent = totals.byStatus?.[status] || 0;
                }
            }
        });
    }
    
    /**
     * Initialize popular concepts visualization
     */
    async function initPopularConcepts() {
        const tagsContainer = document.getElementById('popular-concepts');
        if (!tagsContainer) return;
        
        try {
            // Show loading state
            tagsContainer.innerHTML = '<div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i> Loading concepts...</div>';
            
            // Get concept service
            const conceptService = ServiceRegistry.getConceptService();
            
            // Get popular concepts
            const popularConcepts = await conceptService.getConceptUsageStats();
            
            // Sort concepts by usage count
            const sortedConcepts = popularConcepts
                .sort((a, b) => b.usageCount - a.usageCount)
                .slice(0, 15); // Take top 15 concepts
            
            // Calculate font sizes based on usage count
            const maxCount = Math.max(...sortedConcepts.map(c => c.usageCount), 1);
            const minFontSize = 0.8;
            const maxFontSize = 1.8;
            
            // Clear container
            tagsContainer.innerHTML = '';
            
            // Create concept tags
            sortedConcepts.forEach(concept => {
                if (concept.usageCount === 0) return; // Skip unused concepts
                
                const fontSize = minFontSize + ((concept.usageCount / maxCount) * (maxFontSize - minFontSize));
                const tag = document.createElement('span');
                tag.className = 'tag';
                tag.style.fontSize = `${fontSize}rem`;
                tag.textContent = ValidationService.sanitizeString(concept.value);
                tag.title = `${concept.category}: ${concept.value} (Used in ${concept.usageCount} restaurants)`;
                
                tagsContainer.appendChild(tag);
            });
            
            // If no concepts were added, show empty state
            if (sortedConcepts.length === 0 || tagsContainer.children.length === 0) {
                tagsContainer.innerHTML = '<div class="empty-state">No concepts available</div>';
            }
        } catch (error) {
            ErrorHandlingService.handleError(error, 'Loading popular concepts');
            tagsContainer.innerHTML = '<div class="error-state">Error loading concepts</div>';
        }
    }

    /**
     * Update dashboard with new statistics
     */
    async function refreshDashboard() {
        try {
            // Get application statistics via service
            const restaurantService = ServiceRegistry.getRestaurantService();
            const conceptService = ServiceRegistry.getConceptService();
            
            const stats = {
                totalRestaurants: await restaurantService.count(),
                statusCounts: await restaurantService.getStatusCounts()
            };
            
            // Update dashboard components
            updateStatusCounts({
                restaurants: stats.totalRestaurants,
                byStatus: stats.statusCounts
            });
            
            // Update charts and visualizations
            initCharts();
            initPopularConcepts();
            
            // Update recent activity if it exists
            updateRecentActivity();
            
        } catch (error) {
            ErrorHandlingService.handleError(error, 'Refreshing dashboard');
        }
    }
    
    /**
     * Update recent activity section
     */
    async function updateRecentActivity() {
        // Implementation depends on how recent activity is tracked
        // This is a placeholder for that functionality
    }

    // Public API
    return {
        init,
        refreshDashboard,
        initCharts,
        initPopularConcepts
    };
})();
