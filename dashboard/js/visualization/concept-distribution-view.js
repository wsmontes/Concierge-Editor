/**
 * concept-distribution-view.js
 * 
 * Purpose: Visualizes the distribution of restaurant concepts
 * Shows concept categories and their usage in a pie or doughnut chart
 * 
 * Dependencies:
 *   - dashboard-service.js - For data access and chart creation
 *   - Chart.js - For rendering the visualization
 */

class ConceptDistributionView {
    /**
     * Creates a new ConceptDistributionView
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
            
            // Load concept data
            const conceptData = await DashboardService.getData('concepts', options);
            
            // Process data for visualization
            const chartData = this.processData(conceptData);
            
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
     * @param {Object} conceptData - Concept data from DashboardService
     * @returns {Object} Processed data for the chart
     */
    processData(conceptData) {
        // Extract category data
        const { byCategory, counts } = conceptData;
        
        // Count concepts used by category
        const categoryData = {};
        const categories = Object.keys(byCategory);
        
        categories.forEach(category => {
            categoryData[category] = 0;
            
            // Sum the counts for all concepts in this category
            byCategory[category].forEach(concept => {
                categoryData[category] += counts[concept.id] || 0;
            });
        });
        
        // Generate colors for each category
        const colors = this.generateColors(categories.length);
        
        return {
            labels: categories,
            data: categories.map(cat => categoryData[cat]),
            colors
        };
    }

    /**
     * Generates an array of colors for the chart
     * @param {number} count - Number of colors needed
     * @returns {Array} Array of color strings
     */
    generateColors(count) {
        // Predefined set of colors for better visual harmony
        const colorSet = [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
            '#9966FF', '#FF9F40', '#8AC54B', '#607D8B',
            '#E91E63', '#2196F3', '#FFC107', '#00BCD4'
        ];
        
        // If we have more categories than colors, cycle through them
        const colors = [];
        for (let i = 0; i < count; i++) {
            colors.push(colorSet[i % colorSet.length]);
        }
        
        return colors;
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
        this.chartInstance = DashboardService.createChart(`${this.containerId}Chart`, 'doughnut', {
            labels: data.labels,
            datasets: [{
                data: data.data,
                backgroundColor: data.colors,
                hoverOffset: 4
            }]
        }, {
            plugins: {
                title: {
                    display: true,
                    text: 'Concept Categories Distribution'
                },
                legend: {
                    position: 'right',
                    labels: {
                        boxWidth: 12
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = data.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            },
            cutout: '50%'
        });
    }

    /**
     * Shows an error message when visualization fails
     * @param {string} message - Error message to display
     */
    showError(message) {
        this.vizContainer.innerHTML = `
            <div class="error-message">
                <p>Error loading concept data: ${message}</p>
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
