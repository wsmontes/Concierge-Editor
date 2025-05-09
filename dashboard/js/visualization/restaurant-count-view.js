/**
 * restaurant-count-view.js
 * 
 * Purpose: Visualizes restaurant count over time or by status
 * Provides a line or bar chart showing restaurant growth trends
 * 
 * Dependencies:
 *   - dashboard-service.js - For data access and chart creation
 *   - Chart.js - For rendering the visualization
 */

class RestaurantCountView {
    /**
     * Creates a new RestaurantCountView
     * @param {string} containerId - ID of the container element
     */
    constructor(containerId) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.vizContainer = this.container.querySelector('.visualization');
        this.chartInstance = null;
    }

    /**
     * Initializes the visualization
     * @param {Object} options - Configuration options
     * @returns {Promise<void>}
     */
    async initialize(options = {}) {
        try {
            // Create canvas element for chart
            this.createCanvas();
            
            // Load restaurant data
            const restaurants = await DashboardService.getData('restaurants', options);
            
            // Process data for visualization
            const chartData = this.processData(restaurants);
            
            // Create the chart
            this.createVisualization(chartData);
        } catch (error) {
            console.error(`Error initializing ${this.containerId} visualization:`, error);
            this.showError(error.message);
        }
    }

    /**
     * Creates a canvas element for the chart
     */
    createCanvas() {
        // Clear previous content
        this.vizContainer.innerHTML = '';
        
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.id = `${this.containerId}Chart`;
        this.vizContainer.appendChild(canvas);
    }

    /**
     * Processes raw data into format needed for visualization
     * @param {Array} restaurants - Restaurant data
     * @returns {Object} Processed data for the chart
     */
    processData(restaurants) {
        // Group by month
        const months = {};
        const counts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // 12 months
        
        // Current date for reference
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        
        // Process each restaurant
        restaurants.forEach(restaurant => {
            if (restaurant.timestamp) {
                const date = new Date(restaurant.timestamp);
                const month = date.getMonth();
                const year = date.getFullYear();
                
                // Only count restaurants from current and previous year
                if (year === currentYear || year === currentYear - 1) {
                    // Calculate relative month index (0-11)
                    let monthIndex = month;
                    if (year < currentYear) {
                        monthIndex = month + 12 - currentMonth - 1;
                    } else {
                        monthIndex = month <= currentMonth ? month : month - 12;
                    }
                    
                    // Only count last 12 months
                    if (monthIndex >= 0 && monthIndex < 12) {
                        counts[monthIndex]++;
                    }
                }
            }
        });
        
        // Generate month labels (most recent 12 months)
        const monthNames = [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];
        
        const labels = [];
        for (let i = 11; i >= 0; i--) {
            const monthIndex = (currentMonth - i + 12) % 12;
            labels.push(monthNames[monthIndex]);
        }
        
        // Reverse the data to match the labels (most recent last)
        const reversedCounts = [...counts].reverse();
        
        // Calculate cumulative counts
        const cumulativeCounts = [];
        let total = 0;
        for (const count of reversedCounts) {
            total += count;
            cumulativeCounts.push(total);
        }
        
        return {
            labels,
            newCounts: reversedCounts,
            cumulativeCounts
        };
    }

    /**
     * Creates the actual visualization
     * @param {Object} data - Processed chart data
     */
    createVisualization(data) {
        // Clean up previous chart instance if it exists
        if (this.chartInstance) {
            this.chartInstance.destroy();
        }
        
        const canvas = document.getElementById(`${this.containerId}Chart`);
        if (!canvas) {
            throw new Error('Canvas element not found');
        }
        
        // Create chart using DashboardService
        this.chartInstance = DashboardService.createChart(`${this.containerId}Chart`, 'bar', {
            labels: data.labels,
            datasets: [
                {
                    label: 'New Restaurants',
                    data: data.newCounts,
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgb(54, 162, 235)',
                    borderWidth: 1
                },
                {
                    label: 'Total Restaurants',
                    data: data.cumulativeCounts,
                    type: 'line',
                    fill: false,
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    borderColor: 'rgb(255, 99, 132)',
                    tension: 0.1
                }
            ]
        }, {
            plugins: {
                title: {
                    display: true,
                    text: 'Restaurant Growth (Last 12 Months)'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Count'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Month'
                    }
                }
            }
        });
    }

    /**
     * Shows an error message when visualization fails
     * @param {string} message - Error message to display
     */
    showError(message) {
        this.vizContainer.innerHTML = `
            <div class="error-message">
                <p>Error loading restaurant data: ${message}</p>
                <p>Please try refreshing the dashboard.</p>
            </div>
        `;
    }

    /**
     * Updates the visualization with new data
     * @param {Object} options - Update options
     * @returns {Promise<void>}
     */
    async update(options = {}) {
        await this.initialize(options);
    }
}
