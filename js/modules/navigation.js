/**
 * Navigation Module - Handles navigation between content sections
 * Dependencies: None
 */

const NavigationModule = (function() {
    /**
     * Initialize navigation functionality
     */
    function init() {
        const navLinks = document.querySelectorAll('.sidebar-nav a, .settings-nav a');
        const pageTitle = document.getElementById('page-title');
        
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                
                const targetId = this.getAttribute('href');
                
                if (targetId.startsWith('#')) {
                    // Main navigation - updated sections for multi-restaurant functionality
                    if (targetId === '#dashboard' || targetId === '#restaurants' || 
                        targetId === '#concepts' || targetId === '#gallery' || 
                        targetId === '#import' || targetId === '#settings') {
                        
                        // Update active nav link
                        document.querySelectorAll('.sidebar-nav li').forEach(li => {
                            li.classList.remove('active');
                        });
                        this.parentElement.classList.add('active');
                        
                        // Update page title
                        if (pageTitle) {
                            pageTitle.textContent = this.querySelector('span').textContent;
                        }
                        
                        // Show target section, hide others
                        document.querySelectorAll('.content-section').forEach(section => {
                            section.classList.remove('active');
                        });
                        
                        const targetSection = document.querySelector(targetId);
                        if (targetSection) {
                            targetSection.classList.add('active');
                        }
                        
                        // Clear restaurant detail view when navigating away
                        if (targetId !== '#restaurant-detail' && document.querySelector('#restaurant-detail')) {
                            document.querySelector('#restaurant-detail').classList.remove('active');
                        }
                    }
                    
                    // Settings navigation
                    if (targetId === '#general-settings' || targetId === '#appearance-settings' || 
                        targetId === '#integration-settings' || targetId === '#notification-settings' || 
                        targetId === '#user-settings') {
                        
                        // Update active settings nav
                        document.querySelectorAll('.settings-nav li').forEach(li => {
                            li.classList.remove('active');
                        });
                        this.parentElement.classList.add('active');
                        
                        // Show target panel, hide others
                        document.querySelectorAll('.settings-panel').forEach(panel => {
                            panel.classList.remove('active');
                        });
                        
                        const targetPanel = document.querySelector(targetId);
                        if (targetPanel) {
                            targetPanel.classList.add('active');
                        }
                    }
                }
            });
        });
    }

    // Public API
    return {
        init: init
    };
})();
