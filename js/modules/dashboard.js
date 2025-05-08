/**
 * Dashboard Module - Handles dashboard charts and analytics
 * Dependencies: Chart.js, StorageModule
 */

const DashboardModule = (function() {
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
    function initCharts() {
        const visitorChartCanvas = document.getElementById('visitorChart');
        
        if (!visitorChartCanvas) return;
        
        // Get restaurant data for chart
        const restaurants = JSON.parse(localStorage.getItem('restaurants') || '[]');
        
        // Group restaurants by month
        const monthCounts = {};
        const now = new Date();
        
        // Initialize last 7 months with zero counts
        for (let i = 6; i >= 0; i--) {
            const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
            monthCounts[monthKey] = 0;
        }
        
        // Count restaurants by month
        restaurants.forEach(restaurant => {
            const date = new Date(restaurant.timestamp);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (monthCounts[monthKey] !== undefined) {
                monthCounts[monthKey]++;
            }
        });
        
        // Prepare chart data
        const labels = [];
        const data = [];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        Object.keys(monthCounts).sort().forEach(monthKey => {
            const [year, month] = monthKey.split('-');
            labels.push(`${months[parseInt(month) - 1]}`);
            data.push(monthCounts[monthKey]);
        });
        
        // Create chart
        const visitorChart = new Chart(visitorChartCanvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Restaurants Added',
                    data: data,
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
    }
    
    /**
     * Initialize popular concepts visualization
     */
    function initPopularConcepts() {
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
            
            tagsContainer.appendChild(tag);
        });
    }

    // Public API
    return {
        init: init
    };
})();
