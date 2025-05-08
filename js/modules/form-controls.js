/**
 * Form Controls Module - Handles form elements and interactions
 * Dependencies: UIModule for toast notifications
 */

const FormControlsModule = (function() {
    /**
     * Initialize form controls
     */
    function init() {
        // Toggle switches
        const toggleSwitches = document.querySelectorAll('.toggle-switch');
        
        toggleSwitches.forEach(toggle => {
            toggle.addEventListener('click', function() {
                const slider = this.querySelector('.toggle-slider');
                slider.classList.toggle('active');
            });
        });
        
        // Save buttons functionality (simulated)
        const saveButtons = document.querySelectorAll('.btn-primary[title="Save"], button:has(.fa-save)');
        
        saveButtons.forEach(button => {
            button.addEventListener('click', function() {
                // Simulate saving with a toast notification
                UIModule.showToast('Changes saved successfully!');
            });
        });

        // Menu categories
        initMenuManagement();
    }

    /**
     * Menu management functionality
     */
    function initMenuManagement() {
        const menuCategories = document.querySelectorAll('.menu-category');
        
        menuCategories.forEach(category => {
            category.addEventListener('click', function(e) {
                // Don't trigger if clicking on action buttons
                if (e.target.closest('.category-actions')) return;
                
                // Update active category
                menuCategories.forEach(cat => cat.classList.remove('active'));
                this.classList.add('active');
                
                // In a real app, we would load menu items for this category
                // For now, just simulate with a loading state
                const menuItems = document.querySelector('.menu-items');
                if (menuItems) {
                    menuItems.style.opacity = '0.6';
                    setTimeout(() => {
                        menuItems.style.opacity = '1';
                    }, 500);
                }
            });
        });
    }

    // Public API
    return {
        init: init
    };
})();
