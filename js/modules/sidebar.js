/**
 * Sidebar Module - Handles sidebar responsiveness and toggle functionality
 * Dependencies: None
 */

const SidebarModule = (function() {
    /**
     * Initialize sidebar functionality
     */
    function init() {
        const sidebarToggle = document.getElementById('sidebar-toggle');
        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');
        
        if (!sidebarToggle || !sidebar || !mainContent) return;
        
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('collapsed');
        });
        
        // Handle responsive behavior
        function handleResize() {
            if (window.innerWidth <= 1024) {
                sidebar.classList.add('collapsed');
            } else {
                sidebar.classList.remove('collapsed');
            }
        }
        
        // Initialize on load
        handleResize();
        
        // Re-check on window resize
        window.addEventListener('resize', handleResize);
    }

    // Public API
    return {
        init: init
    };
})();
