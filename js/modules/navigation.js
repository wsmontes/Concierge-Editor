/**
 * Navigation Module - Handles navigation between different sections of the application
 * Dependencies: None
 */
const NavigationModule = (function() {
    // Keep track of navigation history
    let navigationHistory = [];
    let currentSectionId = null;
    
    /**
     * Initialize navigation functionality
     */
    function init() {
        setupNavigationLinks();
        handleInitialNavigation();
        setupHashChangeListener();
    }
    
    /**
     * Set up click listeners on all navigation links
     */
    function setupNavigationLinks() {
        // Get all navigation links
        const navLinks = document.querySelectorAll('.sidebar-nav a, .settings-nav a');
        
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                
                const targetId = this.getAttribute('href');
                
                if (targetId && targetId.startsWith('#')) {
                    navigateTo(targetId.substring(1)); // Remove the # character
                }
            });
        });
    }
    
    /**
     * Handle initial navigation based on URL hash
     */
    function handleInitialNavigation() {
        // Get the initial hash (without the # character)
        let hash = window.location.hash.substring(1);
        
        // Default to dashboard if no hash or invalid hash
        if (!hash || !document.getElementById(hash)) {
            hash = 'dashboard';
            window.location.hash = '#' + hash;
        }
        
        // Navigate to the initial section
        navigateTo(hash);
    }
    
    /**
     * Set up hash change listener for browser back/forward navigation
     */
    function setupHashChangeListener() {
        window.addEventListener('hashchange', function() {
            // Get the new hash (without the # character)
            const hash = window.location.hash.substring(1);
            
            // Only navigate if it's a different section
            if (hash && hash !== currentSectionId) {
                navigateTo(hash);
            }
        });
    }
    
    /**
     * Navigate to a specific section
     * @param {string} sectionId - ID of the section to navigate to
     */
    function navigateTo(sectionId) {
        if (!sectionId) return;
        
        const section = document.getElementById(sectionId);
        if (!section) return;
        
        // Add to navigation history
        if (currentSectionId) {
            navigationHistory.push(currentSectionId);
        }
        currentSectionId = sectionId;
        
        // Update active state in sidebar
        document.querySelectorAll('.sidebar-nav li').forEach(li => {
            li.classList.remove('active');
        });
        
        // Find and update the active link
        const activeLink = document.querySelector(`.sidebar-nav a[href="#${sectionId}"]`);
        if (activeLink && activeLink.parentElement.tagName === 'LI') {
            activeLink.parentElement.classList.add('active');
        }
        
        // Update page title
        const pageTitle = document.getElementById('page-title');
        if (pageTitle && activeLink) {
            pageTitle.textContent = activeLink.querySelector('span')?.textContent || 
                                    activeLink.textContent || 
                                    sectionId.charAt(0).toUpperCase() + sectionId.slice(1);
        }
        
        // Hide all sections and show the target section
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        section.classList.add('active');
        
        // Update URL hash if it doesn't match the current section
        if (window.location.hash !== `#${sectionId}`) {
            // Use history.replaceState to avoid adding to browser history
            window.history.replaceState(null, '', `#${sectionId}`);
        }
        
        // Settings section special handling
        if (sectionId === 'settings') {
            // Activate the first settings panel by default if none is active
            if (!document.querySelector('.settings-panel.active')) {
                const firstPanel = document.querySelector('.settings-panel');
                const firstNavItem = document.querySelector('.settings-nav li');
                
                if (firstPanel) {
                    firstPanel.classList.add('active');
                }
                
                if (firstNavItem) {
                    firstNavItem.classList.add('active');
                }
            }
        }
        
        // Scroll to top of the section
        window.scrollTo(0, 0);
        
        // Trigger a custom event for other modules to respond to navigation
        const navigationEvent = new CustomEvent('navigation', { 
            detail: { section: sectionId }
        });
        document.dispatchEvent(navigationEvent);
    }
    
    /**
     * Go back to previous section in history
     * @return {boolean} Whether navigation was successful
     */
    function goBack() {
        if (navigationHistory.length > 0) {
            const prevSection = navigationHistory.pop();
            navigateTo(prevSection);
            return true;
        }
        return false;
    }
    
    // Public API
    return {
        init: init,
        navigateTo: navigateTo,
        goBack: goBack
    };
})();
