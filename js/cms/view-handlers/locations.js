/**
 * locations.js
 * 
 * Purpose: Implements the locations management view for creating, editing,
 * and visualizing restaurant locations in the CMS.
 * 
 * Dependencies:
 *   - concierge-data.js - For data access
 *   - ui-manager.js - For UI components
 *   - Leaflet - For map visualization
 */

const LocationsView = (() => {
    // View state management
    const state = {
        locations: [],
        restaurants: {},  // Map of restaurant ID to restaurant object
        currentPage: 1,
        itemsPerPage: 10,
        totalPages: 1,
        sortField: 'id',
        sortOrder: 'asc',
        filterText: '',
        map: null,  // Leaflet map instance
        markers: [] // Map markers
    };
    
    /**
     * Initializes the locations view
     * @param {HTMLElement} container - The container element to render the view in
     */
    const initialize = async (container) => {
        UIManager.setPageTitle('Locations');
        
        // Show loading state
        container.innerHTML = '';
        container.appendChild(UIManager.createLoadingSpinner());
        
        try {
            // Load initial data
            await loadInitialData();
            
            // Render the main view
            renderLocationsView(container);
            
            // Set up event listeners
            setupEventListeners();
            
            // Initialize map after the container has been added to DOM
            setTimeout(() => {
                initializeMap();
            }, 100);
            
        } catch (error) {
            console.error('Error initializing locations view:', error);
            container.innerHTML = '';
            container.appendChild(
                UIManager.createPlaceholder(
                    `Error loading location data: ${error.message}. Please check your connection and try again.`,
                    'bi-exclamation-triangle'
                )
            );
        }
    };
    
    /**
     * Loads the initial data needed for the view
     */
    const loadInitialData = async () => {
        if (!ConciergeData.getDatabase().db) {
            throw new Error('Database not connected. Please initialize the database first.');
        }
        
        const restaurantModel = ConciergeData.getEntityModel('restaurant');
        if (!restaurantModel) {
            throw new Error('Restaurant model not found');
        }
        
        try {
            // Load data safely with validation checks
            let locations = [];
            let restaurants = [];

            // Check if restaurantLocations exists and has getAll method before calling
            if (restaurantModel.restaurantLocations && 
                typeof restaurantModel.restaurantLocations.getAll === 'function') {
                locations = await restaurantModel.restaurantLocations.getAll() || [];
            } else {
                console.info('Restaurant locations functionality appears to be missing. This may be expected if locations are not yet implemented.');
                locations = [];
            }
            
            // Always load restaurants since they should be available
            restaurants = await restaurantModel.restaurants.getAll() || [];
            
            // Store data in state
            state.locations = locations;
            
            // Create a lookup map of restaurants by ID for quick reference
            state.restaurants = {};
            restaurants.forEach(restaurant => {
                state.restaurants[restaurant.id] = restaurant;
            });
            
            // Calculate pagination
            const filteredLocations = getFilteredLocations();
            state.totalPages = Math.ceil(filteredLocations.length / state.itemsPerPage) || 1;
            
            // Adjust current page if needed
            if (state.currentPage > state.totalPages) {
                state.currentPage = state.totalPages;
            }
        } catch (error) {
            console.error('Error loading location data:', error);
            throw new Error(`Failed to load location data: ${error.message}`);
        }
    };
    
    /**
     * Renders the main locations view
     * @param {HTMLElement} container - The container element to render the view in
     */
    const renderLocationsView = (container) => {
        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h1 class="mb-0">Locations</h1>
                <button id="addLocationBtn" class="btn btn-primary">
                    <i class="bi bi-plus-lg"></i> Add Location
                </button>
            </div>
            
            <div class="row mb-4">
                <div class="col-12">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="card-title mb-0">Map View</h5>
                        </div>
                        <div class="card-body p-0">
                            <div id="locationsMap" class="map-container"></div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <div class="d-flex justify-content-between align-items-center">
                        <h5 class="card-title mb-0">Location List</h5>
                        <div class="d-flex gap-2 align-items-center">
                            <div class="input-group">
                                <span class="input-group-text">
                                    <i class="bi bi-search"></i>
                                </span>
                                <input type="text" id="locationSearch" class="form-control" placeholder="Search locations...">
                            </div>
                        </div>
                    </div>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th class="sortable" data-sort="id">ID</th>
                                    <th class="sortable" data-sort="restaurant">Restaurant</th>
                                    <th class="sortable" data-sort="address">Address</th>
                                    <th class="sortable" data-sort="city">City</th>
                                    <th class="sortable" data-sort="state">State</th>
                                    <th>Coordinates</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="locationsTableBody">
                                ${renderLocationsTable()}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="card-footer">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            Showing <span id="currentRange">${calculateRange()}</span> of <span id="totalItems">${getFilteredLocations().length}</span> locations
                        </div>
                        <div class="pagination-container">
                            <button id="prevPageBtn" class="btn btn-sm btn-outline-secondary" ${state.currentPage === 1 ? 'disabled' : ''}>
                                <i class="bi bi-chevron-left"></i>
                            </button>
                            <span class="mx-2">Page ${state.currentPage} of ${state.totalPages}</span>
                            <button id="nextPageBtn" class="btn btn-sm btn-outline-secondary" ${state.currentPage === state.totalPages ? 'disabled' : ''}>
                                <i class="bi bi-chevron-right"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    };
    
    /**
     * Initializes the Leaflet map
     */
    const initializeMap = () => {
        const mapContainer = document.getElementById('locationsMap');
        if (!mapContainer) return;
        
        // Clean up existing map if it exists
        if (state.map) {
            state.map.remove();
            state.map = null;
            state.markers = [];
        }
        
        // Initialize map centered on the US
        state.map = L.map('locationsMap').setView([37.0902, -95.7129], 4);
        
        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(state.map);
        
        // Add location markers
        addLocationMarkers();
    };
    
    /**
     * Adds markers for all locations with valid coordinates
     */
    const addLocationMarkers = () => {
        if (!state.map) return;
        
        // Clear existing markers
        state.markers.forEach(marker => marker.remove());
        state.markers = [];
        
        // Add markers for locations with valid coordinates
        state.locations.forEach(location => {
            // Skip locations without valid coordinates
            if (!location.latitude || !location.longitude) return;
            
            const lat = parseFloat(location.latitude);
            const lng = parseFloat(location.longitude);
            
            // Skip invalid coordinates
            if (isNaN(lat) || isNaN(lng)) return;
            
            // Get restaurant name
            const restaurant = state.restaurants[location.restaurantId];
            const restaurantName = restaurant ? restaurant.name : 'Unknown Restaurant';
            
            // Create marker
            const marker = L.marker([lat, lng])
                .addTo(state.map)
                .bindPopup(`
                    <strong>${restaurantName}</strong><br>
                    ${location.address || ''}<br>
                    ${location.city || ''}, ${location.state || ''} ${location.zipCode || ''}
                `);
                
            // Store marker reference
            state.markers.push(marker);
        });
        
        // If there are markers, fit the map to show all of them
        if (state.markers.length > 0) {
            const group = new L.featureGroup(state.markers);
            state.map.fitBounds(group.getBounds().pad(0.1));
        }
    };
    
    /**
     * Gets filtered locations based on search text
     * @returns {Array} Filtered locations
     */
    const getFilteredLocations = () => {
        if (!state.filterText) {
            return state.locations;
        }
        
        const searchTerm = state.filterText.toLowerCase();
        return state.locations.filter(location => {
            // Get restaurant name
            const restaurant = state.restaurants[location.restaurantId];
            const restaurantName = restaurant ? restaurant.name.toLowerCase() : '';
            
            // Search in multiple fields
            return (
                (location.address && location.address.toLowerCase().includes(searchTerm)) ||
                (location.city && location.city.toLowerCase().includes(searchTerm)) ||
                (location.state && location.state.toLowerCase().includes(searchTerm)) ||
                (location.zipCode && location.zipCode.toLowerCase().includes(searchTerm)) ||
                restaurantName.includes(searchTerm)
            );
        });
    };
    
    /**
     * Calculates the current range of items being displayed
     * @returns {string} Range string (e.g., "1-10")
     */
    const calculateRange = () => {
        const filteredLength = getFilteredLocations().length;
        const start = (state.currentPage - 1) * state.itemsPerPage + 1;
        const end = Math.min(start + state.itemsPerPage - 1, filteredLength);
        return filteredLength > 0 ? `${start}-${end}` : '0-0';
    };
    
    /**
     * Renders the locations table rows based on current pagination and sorting
     * @returns {string} HTML string for table rows
     */
    const renderLocationsTable = () => {
        const filteredLocations = getFilteredLocations();
        
        if (filteredLocations.length === 0) {
            return `<tr><td colspan="7" class="text-center">No locations found</td></tr>`;
        }
        
        // Sort locations
        const sortedLocations = [...filteredLocations].sort((a, b) => {
            // Special handling for sorting by restaurant name
            if (state.sortField === 'restaurant') {
                const restaurantA = state.restaurants[a.restaurantId];
                const restaurantB = state.restaurants[b.restaurantId];
                
                const nameA = restaurantA ? restaurantA.name : 'Unknown';
                const nameB = restaurantB ? restaurantB.name : 'Unknown';
                
                return state.sortOrder === 'asc' 
                    ? nameA.localeCompare(nameB)
                    : nameB.localeCompare(nameA);
            }
            
            // Default sorting for other fields
            const aValue = a[state.sortField] || '';
            const bValue = b[state.sortField] || '';
            
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                return state.sortOrder === 'asc' 
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue);
            }
            
            return state.sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
        });
        
        // Paginate locations
        const start = (state.currentPage - 1) * state.itemsPerPage;
        const paginatedLocations = sortedLocations.slice(start, start + state.itemsPerPage);
        
        return paginatedLocations.map(location => {
            const restaurant = state.restaurants[location.restaurantId];
            const restaurantName = restaurant ? restaurant.name : 'Unknown Restaurant';
            
            // Format coordinates
            const hasCoordinates = location.latitude && location.longitude;
            const coordinates = hasCoordinates 
                ? `${parseFloat(location.latitude).toFixed(6)}, ${parseFloat(location.longitude).toFixed(6)}` 
                : 'Not set';
            
            return `
                <tr>
                    <td>${location.id}</td>
                    <td>${restaurantName}</td>
                    <td>${location.address || 'N/A'}</td>
                    <td>${location.city || 'N/A'}</td>
                    <td>${location.state || 'N/A'}</td>
                    <td>${coordinates}</td>
                    <td>
                        <div class="d-flex gap-2">
                            <button class="btn btn-sm btn-outline-primary edit-location" data-id="${location.id}">
                                <i class="bi bi-pencil"></i> Edit
                            </button>
                            <button class="btn btn-sm btn-outline-info view-location" data-id="${location.id}">
                                <i class="bi bi-map"></i> View
                            </button>
                            <button class="btn btn-sm btn-outline-danger delete-location" data-id="${location.id}">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    };
    
    /**
     * Sets up event listeners for the view
     */
    const setupEventListeners = () => {
        // Add location button
        document.getElementById('addLocationBtn')?.addEventListener('click', () => {
            showLocationModal();
        });
        
        // Pagination buttons
        document.getElementById('prevPageBtn')?.addEventListener('click', () => {
            if (state.currentPage > 1) {
                state.currentPage--;
                refreshLocationsTable();
            }
        });
        
        document.getElementById('nextPageBtn')?.addEventListener('click', () => {
            if (state.currentPage < state.totalPages) {
                state.currentPage++;
                refreshLocationsTable();
            }
        });
        
        // Search field
        document.getElementById('locationSearch')?.addEventListener('input', (e) => {
            state.filterText = e.target.value.trim();
            state.currentPage = 1; // Reset to first page when searching
            refreshLocationsTable();
        });
        
        // Sortable headers
        document.querySelectorAll('.sortable')?.forEach(header => {
            header.addEventListener('click', () => {
                const field = header.dataset.sort;
                
                // If clicking on the current sort field, toggle order
                if (field === state.sortField) {
                    state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
                } else {
                    // Otherwise, set the new field and default to ascending
                    state.sortField = field;
                    state.sortOrder = 'asc';
                }
                
                refreshLocationsTable();
            });
        });
        
        // Edit buttons
        document.querySelectorAll('.edit-location')?.forEach(button => {
            button.addEventListener('click', () => {
                const id = parseInt(button.dataset.id);
                editLocation(id);
            });
        });
        
        // View buttons
        document.querySelectorAll('.view-location')?.forEach(button => {
            button.addEventListener('click', () => {
                const id = parseInt(button.dataset.id);
                viewLocationDetails(id);
            });
        });
        
        // Delete buttons
        document.querySelectorAll('.delete-location')?.forEach(button => {
            button.addEventListener('click', () => {
                const id = parseInt(button.dataset.id);
                deleteLocation(id);
            });
        });
    };
    
    /**
     * Shows the location modal for creating or editing
     * @param {Object} location - Location data for editing (null for create)
     */
    const showLocationModal = (location = null) => {
        const isEdit = !!location;
        const title = isEdit ? 'Edit Location' : 'Add New Location';
        
        // Create form element
        const form = createLocationForm(location);
        
        // Show modal
        UIManager.showModal({
            title,
            content: form,
            size: 'lg',
            buttons: [
                {
                    text: isEdit ? 'Update' : 'Create',
                    type: 'primary',
                    action: async (button) => {
                        button.disabled = true;
                        button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
                        
                        if (UIManager.validateForm(form)) {
                            const formData = UIManager.getFormValues(form);
                            await saveLocation(formData);
                        } else {
                            button.disabled = false;
                            button.textContent = isEdit ? 'Update' : 'Create';
                        }
                    }
                },
                {
                    text: 'Cancel',
                    type: 'secondary',
                    action: 'close'
                }
            ]
        });
    };
    
    /**
     * Creates the location form for the modal
     * @param {Object} location - Location data for editing (null for create)
     * @returns {HTMLElement} The form element
     */
    const createLocationForm = async (location = null) => {
        // Get list of restaurants for the dropdown
        const restaurantModel = ConciergeData.getEntityModel('restaurant');
        const restaurants = await restaurantModel.restaurants.getAll();
        
        // Define form schema
        const formSchema = {
            fields: [
                {
                    id: 'id',
                    type: 'hidden',
                    value: location?.id || ''
                },
                {
                    id: 'restaurantId',
                    type: 'select',
                    label: 'Restaurant',
                    required: true,
                    errorMessage: 'Please select a restaurant',
                    options: restaurants.map(restaurant => ({
                        value: restaurant.id,
                        label: restaurant.name
                    })),
                    value: location?.restaurantId || ''
                },
                {
                    id: 'address',
                    type: 'text',
                    label: 'Address',
                    placeholder: 'Street address',
                    required: true,
                    errorMessage: 'Address is required',
                    value: location?.address || ''
                },
                {
                    id: 'city',
                    type: 'text',
                    label: 'City',
                    placeholder: 'City',
                    required: true,
                    errorMessage: 'City is required',
                    value: location?.city || ''
                },
                {
                    id: 'state',
                    type: 'text',
                    label: 'State',
                    placeholder: 'State',
                    required: true,
                    errorMessage: 'State is required',
                    value: location?.state || ''
                },
                {
                    id: 'zipCode',
                    type: 'text',
                    label: 'ZIP Code',
                    placeholder: 'ZIP Code',
                    required: true,
                    errorMessage: 'ZIP Code is required',
                    value: location?.zipCode || ''
                },
                {
                    id: 'latitude',
                    type: 'text',
                    label: 'Latitude',
                    placeholder: 'e.g., 37.7749',
                    helpText: 'Decimal degrees (e.g., 37.7749)',
                    value: location?.latitude || ''
                },
                {
                    id: 'longitude',
                    type: 'text',
                    label: 'Longitude',
                    placeholder: 'e.g., -122.4194',
                    helpText: 'Decimal degrees (e.g., -122.4194)',
                    value: location?.longitude || ''
                }
            ]
        };
        
        const form = UIManager.createForm(formSchema);
        
        // Add geocoding button if not editing
        if (!location) {
            const geocodeBtn = document.createElement('button');
            geocodeBtn.type = 'button';
            geocodeBtn.className = 'btn btn-outline-secondary mt-3';
            geocodeBtn.innerHTML = '<i class="bi bi-geo-alt"></i> Geocode Address';
            geocodeBtn.addEventListener('click', async () => {
                const address = document.getElementById('address').value;
                const city = document.getElementById('city').value;
                const state = document.getElementById('state').value;
                const zipCode = document.getElementById('zipCode').value;
                
                if (!address || !city || !state) {
                    UIManager.showToast('warning', 'Incomplete Address', 'Please fill in at least address, city, and state to geocode.');
                    return;
                }
                
                geocodeBtn.disabled = true;
                geocodeBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Geocoding...';
                
                try {
                    // Note: In a real implementation, we would call a geocoding API here
                    // For this demo, we'll show a message explaining that geocoding requires an API
                    
                    setTimeout(() => {
                        geocodeBtn.disabled = false;
                        geocodeBtn.innerHTML = '<i class="bi bi-geo-alt"></i> Geocode Address';
                        
                        UIManager.showToast('info', 'Geocoding', 'In a production environment, this would connect to a geocoding API to convert the address to coordinates.');
                    }, 1000);
                } catch (error) {
                    geocodeBtn.disabled = false;
                    geocodeBtn.innerHTML = '<i class="bi bi-geo-alt"></i> Geocode Address';
                    UIManager.showToast('danger', 'Geocoding Error', error.message);
                }
            });
            
            // Add geocoding button after the coordinate fields
            const lastField = form.querySelector('#longitude').closest('.mb-3');
            lastField.insertAdjacentElement('afterend', geocodeBtn);
        }
        
        return form;
    };
    
    /**
     * Saves a location (create or update)
     * @param {Object} formData - Form data from the location form
     */
    const saveLocation = async (formData) => {
        try {
            const restaurantModel = ConciergeData.getEntityModel('restaurant');
            if (!restaurantModel) {
                throw new Error('Restaurant model not found');
            }
            
            // Parse form data values
            const locationData = {
                restaurantId: parseInt(formData.restaurantId),
                address: formData.address,
                city: formData.city,
                state: formData.state,
                zipCode: formData.zipCode,
                latitude: formData.latitude || null,
                longitude: formData.longitude || null,
                timestamp: new Date().toISOString()
            };
            
            let result;
            
            // Either update or create
            if (formData.id) {
                locationData.id = parseInt(formData.id);
                await restaurantModel.restaurantLocations.update(locationData);
                result = { id: locationData.id, isNew: false };
            } else {
                const newId = await restaurantModel.restaurantLocations.add(locationData);
                result = { id: newId, isNew: true };
            }
            
            // Refresh data and UI
            await loadInitialData();
            refreshLocationsTable();
            
            // Update map markers
            addLocationMarkers();
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('appModal'));
            if (modal) {
                modal.hide();
            }
            
            // Show success message
            UIManager.showToast(
                'success',
                'Location Saved',
                result.isNew 
                    ? `Location added successfully with ID ${result.id}.`
                    : `Location updated successfully.`
            );
            
        } catch (error) {
            console.error('Error saving location:', error);
            UIManager.showToast('danger', 'Error', `Failed to save location: ${error.message}`);
            
            // Re-enable save button in case of error
            const modal = document.getElementById('appModal');
            if (modal) {
                const saveButton = modal.querySelector('.btn-primary');
                if (saveButton) {
                    saveButton.disabled = false;
                    saveButton.textContent = formData.id ? 'Update' : 'Create';
                }
            }
        }
    };
    
    /**
     * Opens the location editor for a specific location
     * @param {number} id - The location ID to edit
     */
    const editLocation = async (id) => {
        try {
            const restaurantModel = ConciergeData.getEntityModel('restaurant');
            if (!restaurantModel) {
                throw new Error('Restaurant model not found');
            }
            
            // Get location data
            const location = await restaurantModel.restaurantLocations.getById(id);
            if (!location) {
                throw new Error(`Location with ID ${id} not found`);
            }
            
            // Show edit modal
            showLocationModal(location);
            
        } catch (error) {
            console.error(`Error editing location ${id}:`, error);
            UIManager.showToast('danger', 'Error', `Could not load location: ${error.message}`);
        }
    };
    
    /**
     * Shows location details and focuses on the map
     * @param {number} id - The location ID to view
     */
    const viewLocationDetails = async (id) => {
        try {
            const restaurantModel = ConciergeData.getEntityModel('restaurant');
            if (!restaurantModel) {
                throw new Error('Restaurant model not found');
            }
            
            // Get location data
            const location = await restaurantModel.restaurantLocations.getById(id);
            if (!location) {
                throw new Error(`Location with ID ${id} not found`);
            }
            
            // Get restaurant data
            const restaurant = state.restaurants[location.restaurantId] || { name: 'Unknown Restaurant' };
            
            // Check if location has coordinates
            const hasCoordinates = location.latitude && location.longitude;
            
            if (hasCoordinates && state.map) {
                // Focus map on this location
                const lat = parseFloat(location.latitude);
                const lng = parseFloat(location.longitude);
                
                if (!isNaN(lat) && !isNaN(lng)) {
                    state.map.setView([lat, lng], 14);
                    
                    // Find and open the location's popup if it exists
                    state.markers.forEach(marker => {
                        const markerLatLng = marker.getLatLng();
                        if (Math.abs(markerLatLng.lat - lat) < 0.0001 && Math.abs(markerLatLng.lng - lng) < 0.0001) {
                            marker.openPopup();
                        }
                    });
                }
            }
            
            // Show details modal
            UIManager.showModal({
                title: 'Location Details',
                content: `
                    <div class="location-details">
                        <div class="mb-3">
                            <strong>ID:</strong> ${location.id}
                        </div>
                        <div class="mb-3">
                            <strong>Restaurant:</strong> ${restaurant.name}
                        </div>
                        <div class="mb-3">
                            <strong>Address:</strong> ${location.address || 'N/A'}
                        </div>
                        <div class="mb-3">
                            <strong>City:</strong> ${location.city || 'N/A'}
                        </div>
                        <div class="mb-3">
                            <strong>State:</strong> ${location.state || 'N/A'}
                        </div>
                        <div class="mb-3">
                            <strong>ZIP Code:</strong> ${location.zipCode || 'N/A'}
                        </div>
                        <div class="mb-3">
                            <strong>Coordinates:</strong> ${hasCoordinates ? `${location.latitude}, ${location.longitude}` : 'Not set'}
                        </div>
                        ${hasCoordinates ? `
                            <div class="alert alert-info">
                                <i class="bi bi-info-circle"></i> The location has been highlighted on the map.
                            </div>
                        ` : `
                            <div class="alert alert-warning">
                                <i class="bi bi-exclamation-triangle"></i> This location doesn't have coordinates set.
                            </div>
                        `}
                    </div>
                `,
                buttons: [
                    {
                        text: 'Edit',
                        type: 'primary',
                        action: () => {
                            const modal = bootstrap.Modal.getInstance(document.getElementById('appModal'));
                            if (modal) {
                                modal.hide();
                                setTimeout(() => {
                                    editLocation(id);
                                }, 500);
                            }
                        }
                    },
                    {
                        text: 'Close',
                        type: 'secondary',
                        action: 'close'
                    }
                ]
            });
        } catch (error) {
            console.error(`Error viewing location details ${id}:`, error);
            UIManager.showToast('danger', 'Error', `Could not load location details: ${error.message}`);
        }
    };
    
    /**
     * Deletes a location
     * @param {number} id - The location ID to delete
     */
    const deleteLocation = async (id) => {
        // Show confirmation modal
        UIManager.showModal({
            title: 'Confirm Deletion',
            content: `
                <p>Are you sure you want to delete this location? This action cannot be undone.</p>
            `,
            buttons: [
                {
                    text: 'Delete',
                    type: 'danger',
                    action: async (button) => {
                        button.disabled = true;
                        button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Deleting...';
                        
                        try {
                            const restaurantModel = ConciergeData.getEntityModel('restaurant');
                            if (!restaurantModel) {
                                throw new Error('Restaurant model not found');
                            }
                            
                            // Delete the location
                            await restaurantModel.restaurantLocations.delete(id);
                            
                            // Refresh data and UI
                            await loadInitialData();
                            refreshLocationsTable();
                            
                            // Update map markers
                            addLocationMarkers();
                            
                            // Close modal
                            const modal = bootstrap.Modal.getInstance(document.getElementById('appModal'));
                            if (modal) {
                                modal.hide();
                            }
                            
                            UIManager.showToast('success', 'Success', 'Location deleted successfully.');
                            
                        } catch (error) {
                            console.error(`Error deleting location ${id}:`, error);
                            UIManager.showToast('danger', 'Error', `Failed to delete location: ${error.message}`);
                            button.disabled = false;
                            button.textContent = 'Delete';
                        }
                    }
                },
                {
                    text: 'Cancel',
                    type: 'secondary',
                    action: 'close'
                }
            ]
        });
    };
    
    /**
     * Refreshes the locations table with current state
     */
    const refreshLocationsTable = () => {
        const tableBody = document.getElementById('locationsTableBody');
        if (tableBody) {
            tableBody.innerHTML = renderLocationsTable();
            
            // Update range and total items
            document.getElementById('currentRange').textContent = calculateRange();
            document.getElementById('totalItems').textContent = getFilteredLocations().length;
            
            // Update pagination button states
            const prevBtn = document.getElementById('prevPageBtn');
            const nextBtn = document.getElementById('nextPageBtn');
            
            if (prevBtn) prevBtn.disabled = state.currentPage === 1;
            if (nextBtn) nextBtn.disabled = state.currentPage === state.totalPages;
            
            // Reattach event listeners
            setupEventListeners();
        }
    };
    
    /**
     * Cleanup when leaving the view
     */
    const onExit = () => {
        // Clean up map to prevent memory leaks
        if (state.map) {
            state.map.remove();
            state.map = null;
            state.markers = [];
        }
        
        // Reset view state
        state.currentPage = 1;
        state.filterText = '';
    };
    
    // Public API
    return {
        initialize,
        onExit,
        viewLocationDetails
    };
})();
