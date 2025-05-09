/**
 * location-map-view.js
 * 
 * Purpose: Visualizes restaurant locations on a map
 * Shows geographic distribution of restaurants
 * 
 * Dependencies:
 *   - dashboard-service.js - For data access
 *   - Leaflet.js - For map rendering (loaded dynamically)
 */

class LocationMapView {
    /**
     * Creates a new LocationMapView
     * @param {string} containerId - ID of the container element
     */
    constructor(containerId) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.vizContainer = this.container.querySelector('.visualization');
        this.map = null;
        this.markers = [];
    }

    /**
     * Initializes the visualization
     * @param {Object} options - Configuration options
     * @returns {Promise<void>}
     */
    async initialize(options = {}) {
        try {
            // First load Leaflet library if not already loaded
            await this.loadLeaflet();
            
            // Create map container
            this.createMapContainer();
            
            // Load location data
            const locations = await DashboardService.getData('locations', options);
            
            // Create the map
            await this.createVisualization(locations);
        } catch (error) {
            console.error(`Error initializing ${this.containerId} visualization:`, error);
            this.showError(error.message);
        }
    }

    /**
     * Dynamically loads Leaflet library
     * @returns {Promise<void>}
     */
    loadLeaflet() {
        return new Promise((resolve, reject) => {
            // Check if Leaflet is already loaded
            if (window.L) {
                resolve();
                return;
            }
            
            // Load CSS
            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            cssLink.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
            cssLink.crossOrigin = '';
            document.head.appendChild(cssLink);
            
            // Load JS
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
            script.crossOrigin = '';
            
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load Leaflet library'));
            
            document.head.appendChild(script);
        });
    }

    /**
     * Creates a container for the map
     */
    createMapContainer() {
        // Clear previous content
        this.vizContainer.innerHTML = '';
        
        // Create map div
        const mapDiv = document.createElement('div');
        mapDiv.id = `${this.containerId}Map`;
        mapDiv.style.width = '100%';
        mapDiv.style.height = '100%';
        this.vizContainer.appendChild(mapDiv);
    }

    /**
     * Creates the map visualization
     * @param {Array} locations - Location data
     */
    async createVisualization(locations) {
        const mapDiv = document.getElementById(`${this.containerId}Map`);
        if (!mapDiv) {
            throw new Error('Map container element not found');
        }
        
        // Initialize the map if not already initialized
        if (!this.map) {
            this.map = L.map(mapDiv).setView([39.8283, -98.5795], 4); // USA center
            
            // Add tile layer (OpenStreetMap)
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(this.map);
        } else {
            // Clear existing markers
            this.markers.forEach(marker => marker.remove());
            this.markers = [];
        }
        
        // Add location markers
        if (locations.length > 0) {
            const bounds = L.latLngBounds();
            
            locations.forEach(location => {
                if (!location.latitude || !location.longitude) return;
                
                const marker = L.marker([location.latitude, location.longitude])
                    .addTo(this.map)
                    .bindPopup(`
                        <strong>${location.restaurantName}</strong><br>
                        ${location.address}<br>
                        ${location.city}, ${location.state} ${location.zipCode}
                    `);
                
                this.markers.push(marker);
                bounds.extend([location.latitude, location.longitude]);
            });
            
            // Fit map to marker bounds if we have markers
            if (this.markers.length > 0) {
                this.map.fitBounds(bounds, { padding: [30, 30] });
            }
        } else {
            // Show message if no locations
            this.showNoLocationsMessage();
        }
        
        // Fix map rendering (sometimes needed after container is shown)
        setTimeout(() => {
            this.map.invalidateSize();
        }, 100);
    }

    /**
     * Shows a message when no locations are available
     */
    showNoLocationsMessage() {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'no-data-message';
        messageDiv.style.position = 'absolute';
        messageDiv.style.top = '50%';
        messageDiv.style.left = '50%';
        messageDiv.style.transform = 'translate(-50%, -50%)';
        messageDiv.style.background = 'rgba(255, 255, 255, 0.8)';
        messageDiv.style.padding = '10px';
        messageDiv.style.borderRadius = '5px';
        messageDiv.style.zIndex = '1000';
        messageDiv.innerHTML = 'No location data available with valid coordinates';
        
        this.vizContainer.appendChild(messageDiv);
    }

    /**
     * Shows an error message when visualization fails
     * @param {string} message - Error message to display
     */
    showError(message) {
        this.vizContainer.innerHTML = `
            <div class="error-message">
                <p>Error loading map data: ${message}</p>
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
