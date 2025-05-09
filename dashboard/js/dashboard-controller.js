/**
 * dashboard-controller.js
 * 
 * Purpose: Coordinates the dashboard view, manages UI interactions and data refresh
 * Initializes and orchestrates visualization components
 * 
 * Dependencies:
 *   - dashboard-service.js - For data access and chart creation
 *   - visualization/*.js - For specific visualization implementations
 */

document.addEventListener('DOMContentLoaded', async function() {
    // Dashboard state
    const state = {
        timeframe: '30days',
        visualizations: {}
    };

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
            
            // Once connected, load dashboard data
            await loadDashboardData();
        } catch (error) {
            console.error('Database initialization error:', error);
            const dbStatus = document.getElementById('dbStatus');
            dbStatus.textContent = `Error: ${error.message}`;
            dbStatus.classList.add('error');
            
            // Display error in status message
            const statusMessage = document.getElementById('statusMessage');
            statusMessage.textContent = `Error initializing database: ${error.message}`;
        }
    }

    /**
     * Loads all data needed for the dashboard and updates visualizations
     */
    async function loadDashboardData() {
        // Get the timeframe from the select dropdown
        const timeframeSelect = document.getElementById('timeframe');
        state.timeframe = timeframeSelect.value;
        
        // Show loading indicators
        document.querySelectorAll('.dashboard-item .loading').forEach(loader => {
            loader.style.display = 'flex';
        });
        
        try {
            // Initialize all visualization components
            await initializeVisualizations();
            
            // Hide loading indicators
            document.querySelectorAll('.dashboard-item .loading').forEach(loader => {
                loader.style.display = 'none';
            });
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            document.getElementById('statusMessage').textContent = 
                `Error loading dashboard data: ${error.message}`;
            
            // Hide loading indicators
            document.querySelectorAll('.dashboard-item .loading').forEach(loader => {
                loader.style.display = 'none';
            });
            
            // Show error in visualizations
            document.querySelectorAll('.dashboard-item .visualization').forEach(viz => {
                viz.innerHTML = `<div class="error-message">Error loading data: ${error.message}</div>`;
            });
        }
    }

    /**
     * Initializes all visualization components
     */
    async function initializeVisualizations() {
        // Initialize restaurant count visualization
        state.visualizations.restaurantCount = new RestaurantCountView('restaurantCount');
        await state.visualizations.restaurantCount.initialize({
            timeframe: state.timeframe
        });
        
        // Initialize concept distribution visualization
        state.visualizations.conceptDistribution = new ConceptDistributionView('conceptDistribution');
        await state.visualizations.conceptDistribution.initialize({
            timeframe: state.timeframe
        });
        
        // Initialize location map visualization
        state.visualizations.locationMap = new LocationMapView('locationMap');
        await state.visualizations.locationMap.initialize({
            timeframe: state.timeframe
        });
        
        // Initialize curator activity visualization
        state.visualizations.curatorActivity = new CuratorActivityView('curatorActivity');
        await state.visualizations.curatorActivity.initialize({
            timeframe: state.timeframe
        });
    }

    /**
     * Sets up event listeners for dashboard controls
     */
    function setupEventListeners() {
        // Timeframe select change event
        document.getElementById('timeframe').addEventListener('change', event => {
            state.timeframe = event.target.value;
            refreshDashboard();
        });
        
        // Refresh button click event
        document.getElementById('refreshDashboard').addEventListener('click', () => {
            refreshDashboard();
        });
    }

    /**
     * Refreshes all dashboard visualizations
     */
    async function refreshDashboard() {
        // Clear the dashboard service cache to get fresh data
        DashboardService.clearCache();
        
        // Reload all dashboard data
        await loadDashboardData();
    }

    /**
     * Initialize the dashboard
     */
    async function init() {
        setupEventListeners();
        await initializeDatabase();
    }

    // Start the dashboard initialization
    init();
});
