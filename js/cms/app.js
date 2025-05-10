/**
 * app.js
 * 
 * Purpose: Main application controller for the Concierge Editor CMS.
 * Initializes and coordinates core functionality.
 * 
 * Dependencies: 
 *   - concierge-data.js - For database operations
 *   - router.js - For handling view navigation
 *   - ui-manager.js - For UI updates and interactions
 */

const ConciergeApp = (() => {
    // Application state
    const state = {
        dbInitialized: false,
        darkMode: localStorage.getItem('darkMode') === 'true',
        currentView: 'dashboard'
    };

    /**
     * Initializes the application
     */
    const initialize = async () => {
        // Set initial dark mode if needed
        if (state.darkMode) {
            document.body.classList.add('dark-mode');
            document.getElementById('darkModeToggle').innerHTML = '<i class="bi bi-sun"></i> <span>Light Mode</span>';
        }
        
        // Initialize UI components
        UIManager.initialize();
        Router.initialize();
        SearchManager.initialize();
        
        // Set up event listeners
        setupEventListeners();
        
        try {
            // Initialize database connection
            UIManager.updateDatabaseStatus('connecting', 'Connecting to database...');
            await ConciergeData.initialize();
            state.dbInitialized = true;
            UIManager.updateDatabaseStatus('connected', 'Database connected');
            UIManager.showToast('success', 'Database Connection', 'Database initialized successfully');
            
            // Load initial view
            Router.navigateTo('dashboard');
        } catch (error) {
            console.error('Database initialization error:', error);
            UIManager.updateDatabaseStatus('error', 'Database connection failed');
            UIManager.showToast('danger', 'Database Error', error.message, 10000);
        }
    };

    /**
     * Sets up event listeners for global UI interactions
     */
    const setupEventListeners = () => {
        // Sidebar toggle
        document.getElementById('sidebarToggleBtn').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('expanded');
        });
        
        document.getElementById('sidebarCollapseBtn').addEventListener('click', () => {
            document.getElementById('sidebar').classList.remove('expanded');
        });
        
        // Dark mode toggle
        document.getElementById('darkModeToggle').addEventListener('click', (e) => {
            e.preventDefault();
            toggleDarkMode();
        });
        
        // Navigation items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Update active state
                document.querySelectorAll('.nav-item').forEach(navItem => {
                    navItem.classList.remove('active');
                });
                item.classList.add('active');
                
                // Navigate to view
                const view = item.dataset.view;
                Router.navigateTo(view);
                
                // Close sidebar on mobile
                if (window.innerWidth < 768) {
                    document.getElementById('sidebar').classList.remove('expanded');
                }
            });
        });
    };

    /**
     * Toggles dark mode
     */
    const toggleDarkMode = () => {
        state.darkMode = !state.darkMode;
        document.body.classList.toggle('dark-mode', state.darkMode);
        
        const darkModeToggle = document.getElementById('darkModeToggle');
        if (state.darkMode) {
            darkModeToggle.innerHTML = '<i class="bi bi-sun"></i> <span>Light Mode</span>';
        } else {
            darkModeToggle.innerHTML = '<i class="bi bi-moon"></i> <span>Dark Mode</span>';
        }
        
        // Save preference
        localStorage.setItem('darkMode', state.darkMode);
    };

    return {
        initialize,
        getState: () => state
    };
})();

// Initialize the application when the DOM is ready
document.addEventListener('DOMContentLoaded', ConciergeApp.initialize);
