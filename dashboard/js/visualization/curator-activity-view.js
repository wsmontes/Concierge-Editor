/**
 * curator-activity-view.js
 * 
 * Purpose: Visualizes curator activity and contribution stats
 * Shows curator productivity in a bar chart
 * 
 * Dependencies:
 *   - dashboard-service.js - For data access and chart creation
 *   - Chart.js - For rendering the visualization
 */

class CuratorActivityView {
    /**
     * Creates a new CuratorActivityView
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
            
            // Load curator data
            const curatorData = await DashboardService.getData('curatorActivity', options);
            
            // Process data for visualization
            const chartData = this.processData(curatorData);
            
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
     * @param {Array} curators - Curator data
     * @returns {Object} Processed data for the chart
     */
    processData(curators) {
        // Sort curators by restaurant count (descending)
        const sortedCurators = [...curators].sort((a, b) => b.restaurantCount - a.restaurantCount);
        
        // Limit to top 10 curators
        const topCurators = sortedCurators.slice(0, 10);
        
        return {
            labels: topCurators.map(c => c.name || `Curator #${c.id}`),
            restaurantCounts: topCurators.map(c => c.restaurantCount)
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
        
        // If we have no data, show empty message
        if (data.labels.length === 0) {
            this.showNoDataMessage();
            return;
        }
        
        // Create chart using DashboardService
        this.chartInstance = DashboardService.createChart(`${this.containerId}Chart`, 'horizontalBar', {
            labels: data.labels,
            datasets: [{
                label: 'Restaurant Count',
                data: data.restaurantCounts,
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        }, {
            indexAxis: 'y', // Horizontal bars for better readability with long names
            plugins: {
                title: {
                    display: true,
                    text: 'Top 10 Curators by Restaurant Count'
                },
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Restaurants'
                    },
                    ticks: {
                        precision: 0 // Always use integers
                    }
                }
            }
        });
    }

    /**
     * Shows a message when no data is available
     */
    showNoDataMessage() {
        this.vizContainer.innerHTML = `
            <div class="no-data-message" style="
                display: flex;
                height: 100%;
                align-items: center;
                justify-content: center;
                text-align: center;
                color: #6c757d;
            ">
                <p>No curator activity data available</p>
            </div>
        `;
    }

    /**
     * Shows an error message when visualization fails
     * @param {string} message - Error message to display
     */
    showError(message) {
        this.vizContainer.innerHTML = `
            <div class="error-message">
                <p>Error loading curator data: ${message}</p>
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
