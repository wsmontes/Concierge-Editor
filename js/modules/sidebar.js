/**
 * Sidebar Module - Handles sidebar functionality and interactions
 * Dependencies: None
 */
const SidebarModule = (function() {
    /**
     * Initialize sidebar functionality
     */
    function init() {
        initSidebarToggle();
        initMobileDetection();
        initOpenSubmenus();
        loadSavedState();
    }
    
    /**
     * Initialize sidebar toggle functionality
     */
    function initSidebarToggle() {
        const sidebarToggle = document.getElementById('sidebar-toggle');
        const sidebar = document.querySelector('.sidebar');
        
        if (sidebarToggle && sidebar) {
            sidebarToggle.addEventListener('click', function() {
                sidebar.classList.toggle('collapsed');
                
                // Save sidebar state to localStorage
                const isCollapsed = sidebar.classList.contains('collapsed');
                localStorage.setItem('sidebar-collapsed', isCollapsed);
                
                // Update toggle button icon
                const toggleIcon = this.querySelector('i');
                if (toggleIcon) {
                    toggleIcon.className = isCollapsed ? 'fas fa-bars' : 'fas fa-times';
                }
                
                // Dispatch an event that the layout has changed
                window.dispatchEvent(new Event('resize'));
            });
        }
    }
    
    /**
     * Detect if on mobile and auto-collapse sidebar
     */
    function initMobileDetection() {
        const sidebar = document.querySelector('.sidebar');
        
        if (sidebar) {
            const checkMobile = () => {
                if (window.innerWidth < 768) {
                    sidebar.classList.add('collapsed');
                }
            };
            
            // Check on init
            checkMobile();
            
            // Check on resize
            window.addEventListener('resize', checkMobile);
        }
    }
    
    /**
     * Initialize submenu toggle for any nested navigation
     */
    function initOpenSubmenus() {
        const submenuLinks = document.querySelectorAll('.sidebar-nav .has-submenu');
        
        submenuLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                // Only if clicking on the parent link itself, not children
                if (e.target === this || e.target.parentNode === this) {
                    e.preventDefault();
                    
                    // Toggle submenu
                    const submenu = this.querySelector('.submenu');
                    if (submenu) {
                        const isOpen = submenu.classList.contains('open');
                        
                        // Close all other open submenus first
                        document.querySelectorAll('.submenu.open').forEach(menu => {
                            if (menu !== submenu) {
                                menu.classList.remove('open');
                                menu.style.height = '0px';
                                
                                // Update parent link icon
                                const parentIcon = menu.parentNode.querySelector('.submenu-icon');
                                if (parentIcon) {
                                    parentIcon.classList.remove('rotate');
                                }
                            }
                        });
                        
                        // Toggle current submenu
                        submenu.classList.toggle('open', !isOpen);
                        submenu.style.height = isOpen ? '0px' : submenu.scrollHeight + 'px';
                        
                        // Update icon if exists
                        const icon = this.querySelector('.submenu-icon');
                        if (icon) {
                            icon.classList.toggle('rotate', !isOpen);
                        }
                    }
                }
            });
        });
    }
    
    /**
     * Load saved sidebar state from localStorage
     */
    function loadSavedState() {
        const sidebar = document.querySelector('.sidebar');
        const sidebarToggle = document.getElementById('sidebar-toggle');
        
        if (sidebar) {
            const isCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
            if (isCollapsed) {
                sidebar.classList.add('collapsed');
                
                // Update toggle button icon if it exists
                if (sidebarToggle) {
                    const toggleIcon = sidebarToggle.querySelector('i');
                    if (toggleIcon) {
                        toggleIcon.className = 'fas fa-bars';
                    }
                }
            }
        }
    }
    
    // Public API
    return {
        init: init
    };
})();
