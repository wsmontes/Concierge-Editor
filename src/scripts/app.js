/**
 * Main application controller that handles UI interactions and data flow
 * 
 * @module App
 * @depends DatabaseService, SyncService, RestaurantRepository, CuratorRepository
 */

import databaseService from '../services/db/DatabaseService.js';
import { syncService, settingsService, autoSyncService } from '../services/index.js';
import restaurantRepository from '../repositories/RestaurantRepository.js';
import curatorRepository from '../repositories/CuratorRepository.js';

class App {
  constructor() {
    // App state
    this.currentView = 'restaurants';
    this.viewMode = 'grid';
    this.activeRestaurant = null;
    this.currentCurator = null;
    this.searchTerm = '';
    this.filters = {
      curator: 'all',
      concept: 'all',
      source: 'all'
    };
    
    console.log('App: Initializing application...');
    
    // Initialize the application
    this.initialize();
  }
  
  /**
   * Initialize the application components and event listeners
   */
  async initialize() {
    try {
      console.log('App: Setting up event listeners');
      this.setupEventListeners();
      
      // Load current curator
      await this.loadCurrentCurator();
      
      // Setup view
      this.setupView();
      
      // Load initial data
      await this.loadRestaurants();
      
      // Initialize UI components
      this.initializeUI();
      
      console.log('App: Initialization complete');
    } catch (error) {
      console.error('App: Error during initialization:', error);
      this.showError('Failed to initialize the application. Please refresh and try again.');
    }
  }
  
  /**
   * Set up all event listeners for the application
   */
  setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const view = item.dataset.view;
        this.changeView(view);
      });
    });
    
    // Sidebar toggle
    document.getElementById('sidebarToggle').addEventListener('click', () => {
      document.body.classList.toggle('sidebar-collapsed');
    });
    
    // Change curator
    document.getElementById('changeCuratorBtn').addEventListener('click', () => {
      this.showCuratorSelector();
    });
    
    // View mode toggle
    document.getElementById('viewModeGrid').addEventListener('click', () => this.changeViewMode('grid'));
    document.getElementById('viewModeList').addEventListener('click', () => this.changeViewMode('list'));
    
    // Search input
    document.getElementById('searchInput').addEventListener('input', (e) => {
      this.searchTerm = e.target.value.trim();
      this.loadRestaurants();
    });
    
    // Filter controls
    document.getElementById('filterCurator').addEventListener('change', (e) => {
      this.filters.curator = e.target.value;
      this.loadRestaurants();
    });
    
    document.getElementById('filterConcepts').addEventListener('change', (e) => {
      this.filters.concept = e.target.value;
      this.loadRestaurants();
    });
    
    document.getElementById('filterSource').addEventListener('change', (e) => {
      this.filters.source = e.target.value;
      this.loadRestaurants();
    });
    
    // Add new restaurant
    document.getElementById('addNewBtn').addEventListener('click', () => {
      this.showRestaurantEditor();
    });
    
    // Restaurant detail view
    document.getElementById('backToList').addEventListener('click', () => {
      this.closeRestaurantEditor();
    });
    
    document.getElementById('saveRestaurantBtn').addEventListener('click', () => {
      this.saveRestaurant();
    });
    
    document.getElementById('deleteRestaurantBtn').addEventListener('click', () => {
      this.showDeleteConfirmation();
    });
    
    // Sync now button
    document.getElementById('syncNowBtn').addEventListener('click', async () => {
      await this.performManualSync();
    });
    
    // Concept related
    document.getElementById('addConceptBtn').addEventListener('click', () => {
      this.showAddConceptModal();
    });
    
    // Modal close buttons
    document.querySelectorAll('.modal-close, .modal-cancel').forEach(button => {
      button.addEventListener('click', () => {
        this.closeAllModals();
      });
    });
    
    // Add curator button
    document.getElementById('addCuratorBtn').addEventListener('click', () => {
      this.showAddCuratorModal();
    });
    
    // Save curator button
    document.getElementById('saveCuratorBtn').addEventListener('click', () => {
      this.saveCurator();
    });
    
    // Save concept button
    document.getElementById('saveConceptBtn').addEventListener('click', () => {
      this.saveConcept();
    });
    
    // Concept category selection
    document.getElementById('conceptCategory').addEventListener('change', (e) => {
      const newCategoryGroup = document.getElementById('newCategoryGroup');
      if (e.target.value === 'new') {
        newCategoryGroup.classList.remove('hidden');
      } else {
        newCategoryGroup.classList.add('hidden');
      }
    });
    
    // Confirm delete button
    document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
      this.deleteConfirmed();
    });
  }
  
  /**
   * Initialize UI components and state
   */
  async initializeUI() {
    // Update sync status
    await this.updateSyncStatus();
    
    // Load curators for filter
    await this.loadCuratorsForFilter();
    
    // Load concepts for filter
    await this.loadConceptsForFilter();
  }
  
  /**
   * Change the current view
   * @param {string} viewName - View name to switch to
   */
  changeView(viewName) {
    if (viewName === this.currentView) return;
    
    console.log(`App: Changing view to ${viewName}`);
    
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      if (item.dataset.view === viewName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
    
    // Hide all views
    document.querySelectorAll('.content-view').forEach(view => {
      view.classList.remove('active');
    });
    
    // Show selected view
    document.getElementById(`${viewName}View`).classList.add('active');
    
    // Update breadcrumb
    document.getElementById('breadcrumb').innerHTML = `<span>${viewName.charAt(0).toUpperCase() + viewName.slice(1)}</span>`;
    
    // Update header buttons based on view
    this.updateHeaderForView(viewName);
    
    this.currentView = viewName;
    
    // Load view-specific data
    switch (viewName) {
      case 'restaurants':
        this.loadRestaurants();
        break;
      case 'curators':
        this.loadCurators();
        break;
      case 'concepts':
        this.loadConcepts();
        break;
      case 'analytics':
        this.loadAnalytics();
        break;
      case 'settings':
        this.loadSettings();
        break;
    }
  }
  
  /**
   * Update header actions based on current view
   * @param {string} viewName - Current view name
   */
  updateHeaderForView(viewName) {
    const addNewBtn = document.getElementById('addNewBtn');
    const searchInput = document.getElementById('searchInput');
    
    // Reset placeholder
    searchInput.placeholder = 'Search...';
    
    switch (viewName) {
      case 'restaurants':
        addNewBtn.style.display = 'flex';
        addNewBtn.querySelector('span').textContent = 'Add Restaurant';
        searchInput.placeholder = 'Search restaurants...';
        break;
      case 'curators':
        addNewBtn.style.display = 'none';
        searchInput.placeholder = 'Search curators...';
        break;
      case 'concepts':
        addNewBtn.style.display = 'none';
        searchInput.placeholder = 'Search concepts...';
        break;
      case 'analytics':
        addNewBtn.style.display = 'none';
        searchInput.style.display = 'none';
        break;
      case 'settings':
        addNewBtn.style.display = 'none';
        searchInput.style.display = 'none';
        break;
    }
  }
  
  /**
   * Change the view mode (grid or list)
   * @param {string} mode - View mode ('grid' or 'list')
   */
  changeViewMode(mode) {
    if (mode === this.viewMode) return;
    
    console.log(`App: Changing view mode to ${mode}`);
    
    // Update buttons
    document.getElementById('viewModeGrid').classList.toggle('active', mode === 'grid');
    document.getElementById('viewModeList').classList.toggle('active', mode === 'list');
    
    // Update container class
    const container = document.getElementById('restaurantsContainer');
    container.classList.remove('grid-view', 'list-view');
    container.classList.add(`${mode}-view`);
    
    this.viewMode = mode;
  }
  
  /**
   * Load current curator information
   */
  async loadCurrentCurator() {
    try {
      const curator = await curatorRepository.getCurrentCurator();
      this.currentCurator = curator;
      
      const curatorNameEl = document.getElementById('currentCuratorName');
      
      if (curator) {
        curatorNameEl.textContent = curator.name;
        console.log(`App: Current curator loaded: ${curator.name}`);
      } else {
        curatorNameEl.textContent = 'No curator selected';
        console.log('App: No curator found, prompting to create one');
        
        // Show dialog to create first curator
        setTimeout(() => this.showAddCuratorModal(), 1000);
      }
    } catch (error) {
      console.error('App: Error loading current curator:', error);
      document.getElementById('currentCuratorName').textContent = 'Error loading curator';
    }
  }
  
  /**
   * Show curator selector modal
   */
  async showCuratorSelector() {
    try {
      // Load curators
      const curators = await curatorRepository.getAllCurators();
      
      // Create and show modal
      const modalOverlay = document.getElementById('modalOverlay');
      const modalHtml = `
        <div id="curatorSelectorModal" class="modal">
          <div class="modal-header">
            <h3>Select Curator</h3>
            <button class="modal-close" aria-label="Close Modal">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="modal-body">
            <div class="curator-list">
              ${curators.map(curator => `
                <div class="curator-item ${curator.id === (this.currentCurator?.id || 0) ? 'active' : ''}" data-id="${curator.id}">
                  <div class="avatar">
                    <i class="fas fa-user"></i>
                  </div>
                  <div class="curator-details">
                    <span class="curator-name">${curator.name}</span>
                    <span class="curator-meta">${curator.origin || 'local'}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-subtle modal-cancel">Cancel</button>
            <button id="newCuratorBtn" class="btn btn-primary">New Curator</button>
          </div>
        </div>
      `;
      
      modalOverlay.innerHTML += modalHtml;
      modalOverlay.classList.remove('hidden');
      
      // Add event listeners
      const selectModal = document.getElementById('curatorSelectorModal');
      const closeBtn = selectModal.querySelector('.modal-close');
      const cancelBtn = selectModal.querySelector('.modal-cancel');
      const newCuratorBtn = document.getElementById('newCuratorBtn');
      
      closeBtn.addEventListener('click', () => this.closeAllModals());
      cancelBtn.addEventListener('click', () => this.closeAllModals());
      newCuratorBtn.addEventListener('click', () => {
        this.closeAllModals();
        this.showAddCuratorModal();
      });
      
      // Curator selection
      selectModal.querySelectorAll('.curator-item').forEach(item => {
        item.addEventListener('click', async () => {
          const curatorId = parseInt(item.dataset.id);
          await this.selectCurator(curatorId);
          this.closeAllModals();
        });
      });
    } catch (error) {
      console.error('App: Error showing curator selector:', error);
      this.showError('Failed to load curators. Please try again.');
    }
  }
  
  /**
   * Select a curator
   * @param {number} curatorId - Curator ID to select
   */
  async selectCurator(curatorId) {
    try {
      await curatorRepository.setCurrentCurator(curatorId);
      await this.loadCurrentCurator();
      await this.loadRestaurants();
    } catch (error) {
      console.error('App: Error selecting curator:', error);
      this.showError('Failed to change curator. Please try again.');
    }
  }
  
  /**
   * Load all restaurants with current filters
   */
  async loadRestaurants() {
    try {
      console.log('App: Loading restaurants with filters:', this.filters);
      
      // Show loader
      const container = document.getElementById('restaurantsContainer');
      container.innerHTML = `
        <div class="loader">
          <div class="spinner"></div>
          <span>Loading restaurants...</span>
        </div>
      `;
      
      // Filter options based on app state
      const options = {
        curatorId: this.currentCurator?.id,
        onlyCuratorRestaurants: this.filters.curator === 'all',
        includeRemote: true,
        includeLocal: true
      };
      
      // Apply source filter
      if (this.filters.source === 'local') {
        options.includeRemote = false;
      } else if (this.filters.source === 'remote') {
        options.includeLocal = false;
      } else if (this.filters.source === 'unsynced') {
        options.includeRemote = false;
        options.onlyUnsynced = true;
      }
      
      // Get restaurants with filters
      const restaurants = await restaurantRepository.getRestaurants(options);
      
      // Apply search filter if needed
      const filtered = this.searchTerm ? 
        this.filterRestaurantsBySearchTerm(restaurants, this.searchTerm) : 
        restaurants;
        
      console.log(`App: Loaded ${filtered.length} restaurants after filtering`);
      
      // Show no results if empty
      if (filtered.length === 0) {
        document.getElementById('emptyState').classList.remove('hidden');
        container.innerHTML = '';
      } else {
        document.getElementById('emptyState').classList.add('hidden');
        this.renderRestaurants(filtered);
      }
    } catch (error) {
      console.error('App: Error loading restaurants:', error);
      this.showError('Failed to load restaurants. Please try again.');
    }
  }
  
  /**
   * Filter restaurants by search term
   * @param {Array} restaurants - Restaurants to filter
   * @param {string} searchTerm - Search term to filter by
   * @returns {Array} Filtered restaurants
   */
  filterRestaurantsBySearchTerm(restaurants, searchTerm) {
    const term = searchTerm.toLowerCase();
    return restaurants.filter(restaurant => {
      return (
        (restaurant.name && restaurant.name.toLowerCase().includes(term)) ||
        (restaurant.description && restaurant.description.toLowerCase().includes(term))
      );
    });
  }
  
  /**
   * Render restaurants to the container
   * @param {Array} restaurants - Restaurants to render
   */
  renderRestaurants(restaurants) {
    const container = document.getElementById('restaurantsContainer');
    
    // Create restaurant cards
    const html = restaurants.map(restaurant => {
      // Determine source icon and color
      let sourceIcon, sourceLabel, sourceClass;
      if (restaurant.source === 'remote') {
        sourceIcon = 'fa-cloud';
        sourceLabel = 'Server';
        sourceClass = 'remote';
      } else if (restaurant.serverId) {
        sourceIcon = 'fa-cloud-upload-alt';
        sourceLabel = 'Synced';
        sourceClass = 'synced';
      } else {
        sourceIcon = 'fa-laptop';
        sourceLabel = 'Local';
        sourceClass = 'local';
      }
      
      // Format date
      const date = restaurant.timestamp ? new Date(restaurant.timestamp) : new Date();
      const formattedDate = date.toLocaleDateString();
      
      // Get concepts HTML
      const conceptsHtml = restaurant.concepts && restaurant.concepts.length > 0 ?
        restaurant.concepts.slice(0, 3).map(concept => 
          `<span class="concept-tag">${concept.category}: ${concept.value}</span>`
        ).join('') :
        '';
        
      const moreConceptsCount = restaurant.concepts && restaurant.concepts.length > 3 ?
        restaurant.concepts.length - 3 : 0;
        
      const moreConceptsHtml = moreConceptsCount > 0 ?
        `<span class="concept-tag">+${moreConceptsCount} more</span>` : '';
      
      // Create card HTML based on view mode
      if (this.viewMode === 'list') {
        return `
          <div class="restaurant-card" data-id="${restaurant.id}">
            <div class="card-image">
              <div class="card-image-placeholder">
                <i class="fas fa-utensils"></i>
              </div>
            </div>
            <div class="card-content">
              <div class="card-main">
                <h3 class="card-title">${restaurant.name || 'Untitled Restaurant'}</h3>
                <p class="card-description">${restaurant.description || 'No description available.'}</p>
              </div>
              <div class="card-side">
                <div class="card-tags">
                  ${conceptsHtml}
                  ${moreConceptsHtml}
                </div>
                <div class="card-footer">
                  <span class="source-indicator ${sourceClass}">
                    <i class="fas ${sourceIcon}"></i> ${sourceLabel}
                  </span>
                  <div class="card-actions">
                    <button class="btn-icon edit-restaurant" title="Edit Restaurant">
                      <i class="fas fa-edit"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
      } else {
        return `
          <div class="restaurant-card" data-id="${restaurant.id}">
            <div class="card-image">
              <div class="card-image-placeholder">
                <i class="fas fa-utensils"></i>
              </div>
            </div>
            <div class="card-content">
              <h3 class="card-title">${restaurant.name || 'Untitled Restaurant'}</h3>
              <div class="card-meta">
                <span><i class="fas fa-user"></i> ${restaurant.curatorName || 'Unknown'}</span>
                <span><i class="fas fa-calendar"></i> ${formattedDate}</span>
              </div>
              <p class="card-description">${restaurant.description || 'No description available.'}</p>
              <div class="card-tags">
                ${conceptsHtml}
                ${moreConceptsHtml}
              </div>
              <div class="card-footer">
                <span class="source-indicator ${sourceClass}">
                  <i class="fas ${sourceIcon}"></i> ${sourceLabel}
                </span>
                <div class="card-actions">
                  <button class="btn-icon edit-restaurant" title="Edit Restaurant">
                    <i class="fas fa-edit"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
      }
    }).join('');
    
    container.innerHTML = html;
    
    // Add event listeners to restaurant cards
    container.querySelectorAll('.restaurant-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-restaurant');
        if (editBtn) {
          // If edit button clicked, navigate to edit
          e.stopPropagation();
          const restaurantId = parseInt(card.dataset.id);
          this.editRestaurant(restaurantId);
        } else {
          // Otherwise navigate to view details
          const restaurantId = parseInt(card.dataset.id);
          this.viewRestaurant(restaurantId);
        }
      });
    });
  }
  
  /**
   * View a restaurant in detail
   * @param {number} restaurantId - Restaurant ID to view
   */
  async viewRestaurant(restaurantId) {
    await this.editRestaurant(restaurantId, true);
  }
  
  /**
   * Edit a restaurant
   * @param {number} restaurantId - Restaurant ID to edit
   * @param {boolean} viewOnly - Whether to show in view-only mode
   */
  async editRestaurant(restaurantId, viewOnly = false) {
    try {
      console.log(`App: Editing restaurant ${restaurantId}`);
      
      // Get restaurant details
      const restaurant = await restaurantRepository.getRestaurantById(restaurantId);
      if (!restaurant) {
        throw new Error(`Restaurant with ID ${restaurantId} not found`);
      }
      
      this.activeRestaurant = restaurant;
      this.populateRestaurantEditor(restaurant, viewOnly);
      
      // Switch to detail view
      document.getElementById('restaurantsView').classList.remove('active');
      document.getElementById('restaurantDetailView').classList.add('active');
      
      // Update breadcrumb
      document.getElementById('breadcrumb').innerHTML = `
        <span class="breadcrumb-item">Restaurants</span>
        <i class="fas fa-angle-right breadcrumb-separator"></i>
        <span class="breadcrumb-item">${restaurant.name || 'Untitled Restaurant'}</span>
      `;
    } catch (error) {
      console.error(`App: Error editing restaurant ${restaurantId}:`, error);
      this.showError('Failed to load restaurant details. Please try again.');
    }
  }
  
  /**
   * Populate the restaurant editor with data
   * @param {Object} restaurant - Restaurant object
   * @param {boolean} viewOnly - Whether to show in view-only mode
   */
  async populateRestaurantEditor(restaurant, viewOnly = false) {
    // Basic info
    document.getElementById('restaurantName').value = restaurant.name || '';
    document.getElementById('restaurantDescription').value = restaurant.description || '';
    document.getElementById('restaurantTranscription').value = restaurant.transcription || '';
    
    // Curator
    await this.populateCuratorSelect();
    document.getElementById('restaurantCurator').value = restaurant.curatorId || '';
    
    // Location
    if (restaurant.location) {
      document.getElementById('restaurantLatitude').value = restaurant.location.latitude || '';
      document.getElementById('restaurantLongitude').value = restaurant.location.longitude || '';
      document.getElementById('restaurantAddress').value = restaurant.location.address || '';
    } else {
      document.getElementById('restaurantLatitude').value = '';
      document.getElementById('restaurantLongitude').value = '';
      document.getElementById('restaurantAddress').value = '';
    }
    
    // Concepts
    this.renderConceptTags(restaurant.concepts || []);
    
    // Metadata
    document.getElementById('metaCreated').textContent = restaurant.timestamp ? 
      new Date(restaurant.timestamp).toLocaleString() : '-';
      
    document.getElementById('metaUpdated').textContent = restaurant.updated ? 
      new Date(restaurant.updated).toLocaleString() : 'Never';
      
    document.getElementById('metaSource').textContent = restaurant.source === 'remote' ? 
      'Server' : 'Local';
      
    document.getElementById('metaServerId').textContent = restaurant.serverId || 
      'Not synced';
      
    // Set view-only mode if needed
    if (viewOnly) {
      document.querySelectorAll('#restaurantDetailView input, #restaurantDetailView textarea, #restaurantDetailView select').forEach(el => {
        el.disabled = true;
      });
      document.getElementById('deleteRestaurantBtn').style.display = 'none';
      document.getElementById('saveRestaurantBtn').textContent = 'Done';
    } else {
      document.querySelectorAll('#restaurantDetailView input, #restaurantDetailView textarea, #restaurantDetailView select').forEach(el => {
        el.disabled = false;
      });
      document.getElementById('deleteRestaurantBtn').style.display = 'inline-flex';
      document.getElementById('saveRestaurantBtn').innerHTML = '<i class="fas fa-save"></i> Save';
    }
  }
  
  /**
   * Populate the curator select dropdown
   */
  async populateCuratorSelect() {
    try {
      const curators = await curatorRepository.getAllCurators();
      const select = document.getElementById('restaurantCurator');
      
      // Clear existing options
      while (select.options.length > 1) {
        select.remove(1);
      }
      
      // Add curator options
      curators.forEach(curator => {
        const option = document.createElement('option');
        option.value = curator.id;
        option.textContent = curator.name;
        select.appendChild(option);
      });
    } catch (error) {
      console.error('App: Error populating curator select:', error);
    }
  }
  
  /**
   * Render concept tags in the editor
   * @param {Array} concepts - Concepts to render
   */
  renderConceptTags(concepts) {
    const container = document.getElementById('conceptTags');
    
    if (!concepts || concepts.length === 0) {
      container.innerHTML = '<p class="empty-concepts">No concepts added yet</p>';
      return;
    }
    
    const html = concepts.map(concept => `
      <div class="concept-tag">
        <span class="tag-category">${concept.category}</span>
        <span class="tag-value">${concept.value}</span>
        <span class="tag-remove" data-category="${concept.category}" data-value="${concept.value}">
          <i class="fas fa-times"></i>
        </span>
      </div>
    `).join('');
    
    container.innerHTML = html;
    
    // Add event listeners for removing concepts
    container.querySelectorAll('.tag-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const category = btn.dataset.category;
        const value = btn.dataset.value;
        this.removeConcept(category, value);
      });
    });
  }
  
  /**
   * Remove a concept from the active restaurant
   * @param {string} category - Concept category
   * @param {string} value - Concept value
   */
  removeConcept(category, value) {
    if (!this.activeRestaurant || !this.activeRestaurant.concepts) return;
    
    // Filter out the concept
    this.activeRestaurant.concepts = this.activeRestaurant.concepts.filter(concept => 
      concept.category !== category || concept.value !== value
    );
    
    // Re-render concept tags
    this.renderConceptTags(this.activeRestaurant.concepts);
  }
  
  /**
   * Show the add concept modal
   */
  async showAddConceptModal() {
    try {
      // Reset form
      document.getElementById('conceptValue').value = '';
      document.getElementById('newCategoryName').value = '';
      document.getElementById('newCategoryGroup').classList.add('hidden');
      
      // Get concept categories
      const categories = await restaurantRepository.getAllConceptCategories();
      const categorySelect = document.getElementById('conceptCategory');
      
      // Clear existing options
      while (categorySelect.options.length > 2) {
        categorySelect.remove(2);
      }
      
      // Add category options
      categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
      });
      
      // Select first category or nothing
      categorySelect.value = categories.length > 0 ? categories[0] : '';
      
      // Show modal
      document.getElementById('modalOverlay').classList.remove('hidden');
      document.getElementById('addConceptModal').classList.remove('hidden');
      
      // Focus on value input
      document.getElementById('conceptValue').focus();
    } catch (error) {
      console.error('App: Error showing add concept modal:', error);
      this.showError('Failed to load concept categories. Please try again.');
    }
  }
  
  /**
   * Save a concept to the current restaurant
   */
  async saveConcept() {
    try {
      // Get form values
      let category = document.getElementById('conceptCategory').value;
      const value = document.getElementById('conceptValue').value.trim();
      
      if (category === 'new') {
        category = document.getElementById('newCategoryName').value.trim();
      }
      
      // Validate
      if (!category || !value) {
        this.showError('Please provide both category and value.');
        return;
      }
      
      // Check for duplicate
      if (this.activeRestaurant.concepts && 
          this.activeRestaurant.concepts.some(c => 
            c.category === category && c.value === value)) {
        this.showError('This concept already exists for this restaurant.');
        return;
      }
      
      // Add to restaurant
      if (!this.activeRestaurant.concepts) {
        this.activeRestaurant.concepts = [];
      }
      
      this.activeRestaurant.concepts.push({ category, value });
      
      // Re-render concepts
      this.renderConceptTags(this.activeRestaurant.concepts);
      
      // Close modal
      this.closeAllModals();
      
      this.showSuccess('Concept added successfully.');
    } catch (error) {
      console.error('App: Error saving concept:', error);
      this.showError('Failed to save concept. Please try again.');
    }
  }
  
  /**
   * Show the add curator modal
   */
  showAddCuratorModal() {
    // Reset form
    document.getElementById('curatorName').value = '';
    document.getElementById('curatorApiKey').value = '';
    
    // Show modal
    document.getElementById('modalOverlay').classList.remove('hidden');
    document.getElementById('addCuratorModal').classList.remove('hidden');
    
    // Focus on name input
    document.getElementById('curatorName').focus();
  }
  
  /**
   * Save a new curator
   */
  async saveCurator() {
    try {
      // Get form values
      const name = document.getElementById('curatorName').value.trim();
      const apiKey = document.getElementById('curatorApiKey').value.trim();
      
      // Validate
      if (!name) {
        this.showError('Please enter a curator name.');
        return;
      }
      
      // Save curator
      const curatorId = await curatorRepository.saveCurator(name, apiKey);
      
      // Set as current if we don't have one
      if (!this.currentCurator) {
        await curatorRepository.setCurrentCurator(curatorId);
        await this.loadCurrentCurator();
      }
      
      // Close modal
      this.closeAllModals();
      
      // Update curator selects
      await this.loadCuratorsForFilter();
      await this.populateCuratorSelect();
      
      this.showSuccess('Curator added successfully.');
    } catch (error) {
      console.error('App: Error saving curator:', error);
      this.showError('Failed to save curator. Please try again.');
    }
  }
  
  /**
   * Show the restaurant editor for a new restaurant
   */
  showRestaurantEditor() {
    // Reset form
    this.activeRestaurant = {
      name: '',
      description: '',
      transcription: '',
      curatorId: this.currentCurator ? this.currentCurator.id : null,
      concepts: [],
      location: null,
      photos: []
    };
    
    // Show editor
    this.populateRestaurantEditor(this.activeRestaurant);
    
    // Switch to detail view
    document.getElementById('restaurantsView').classList.remove('active');
    document.getElementById('restaurantDetailView').classList.add('active');
    
    // Update breadcrumb
    document.getElementById('breadcrumb').innerHTML = `
      <span class="breadcrumb-item">Restaurants</span>
      <i class="fas fa-angle-right breadcrumb-separator"></i>
      <span class="breadcrumb-item">New Restaurant</span>
    `;
    
    // Focus name input
    document.getElementById('restaurantName').focus();
  }
  
  /**
   * Close the restaurant editor and return to list
   */
  closeRestaurantEditor() {
    // Switch back to list view
    document.getElementById('restaurantsView').classList.add('active');
    document.getElementById('restaurantDetailView').classList.remove('active');
    
    // Update breadcrumb
    document.getElementById('breadcrumb').innerHTML = `<span>Restaurants</span>`;
    
    // Clear active restaurant
    this.activeRestaurant = null;
  }
  
  /**
   * Save the current restaurant
   */
  async saveRestaurant() {
    try {
      // Get form values
      const name = document.getElementById('restaurantName').value.trim();
      const description = document.getElementById('restaurantDescription').value.trim();
      const transcription = document.getElementById('restaurantTranscription').value.trim();
      const curatorId = parseInt(document.getElementById('restaurantCurator').value) || null;
      
      // Get location data
      const latitude = parseFloat(document.getElementById('restaurantLatitude').value) || null;
      const longitude = parseFloat(document.getElementById('restaurantLongitude').value) || null;
      const address = document.getElementById('restaurantAddress').value.trim();
      
      // Validate
      if (!name) {
        this.showError('Please enter a restaurant name.');
        return;
      }
      
      // Prepare location object
      let location = null;
      if (latitude !== null && longitude !== null) {
        location = { latitude, longitude, address };
      }
      
      // Save or update
      if (this.activeRestaurant.id) {
        // Update existing
        await restaurantRepository.updateRestaurant(
          this.activeRestaurant.id,
          name,
          curatorId,
          this.activeRestaurant.concepts || [],
          location,
          this.activeRestaurant.photos || [],
          transcription,
          description
        );
        this.showSuccess('Restaurant updated successfully.');
      } else {
        // Create new
        await restaurantRepository.saveRestaurant(
          name,
          curatorId,
          this.activeRestaurant.concepts || [],
          location,
          this.activeRestaurant.photos || [],
          transcription,
          description
        );
        this.showSuccess('Restaurant created successfully.');
      }
      
      // Close editor and refresh list
      this.closeRestaurantEditor();
      await this.loadRestaurants();
    } catch (error) {
      console.error('App: Error saving restaurant:', error);
      this.showError('Failed to save restaurant. Please try again.');
    }
  }
  
  /**
   * Show delete confirmation dialog
   */
  showDeleteConfirmation() {
    if (!this.activeRestaurant || !this.activeRestaurant.id) return;
    
    // Set restaurant name in modal
    document.getElementById('deleteItemName').textContent = 
      this.activeRestaurant.name || 'this restaurant';
    
    // Show modal
    document.getElementById('modalOverlay').classList.remove('hidden');
    document.getElementById('confirmDeleteModal').classList.remove('hidden');
  }
  
  /**
   * Delete the restaurant after confirmation
   */
  async deleteConfirmed() {
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    const itemType = confirmBtn.dataset.itemType;
    
    if (itemType === 'concept') {
      const category = confirmBtn.dataset.category;
      const value = confirmBtn.dataset.value;
      
      // Show a message that this feature is not yet implemented
      this.showInfo(`Concept deletion for ${category}:${value} will be implemented in a future update.`);
      this.closeAllModals();
      return;
    }
    
    // Handle restaurant deletion (existing code)
    if (!this.activeRestaurant || !this.activeRestaurant.id) return;
    
    try {
      await restaurantRepository.deleteRestaurant(this.activeRestaurant.id);
      this.showSuccess('Restaurant deleted successfully.');
      
      // Close modal and editor
      this.closeAllModals();
      this.closeRestaurantEditor();
      
      // Refresh restaurant list
      await this.loadRestaurants();
    } catch (error) {
      console.error('App: Error deleting restaurant:', error);
      this.showError('Failed to delete restaurant. Please try again.');
    }
  }
  
  /**
   * Close all modals
   */
  closeAllModals() {
    const modalOverlay = document.getElementById('modalOverlay');
    
    // Hide all modals
    modalOverlay.querySelectorAll('.modal').forEach(modal => {
      modal.classList.add('hidden');
    });
    
    // Remove dynamic modals
    const dynamicModal = document.getElementById('curatorSelectorModal');
    if (dynamicModal) {
      dynamicModal.remove();
    }
    
    // Hide overlay
    modalOverlay.classList.add('hidden');
  }
  
  /**
   * Load curators for filter dropdown
   */
  async loadCuratorsForFilter() {
    try {
      const curators = await curatorRepository.getAllCurators();
      const select = document.getElementById('filterCurator');
      
      // Clear existing options except first
      while (select.options.length > 1) {
        select.remove(1);
      }
      
      // Add curator options
      curators.forEach(curator => {
        const option = document.createElement('option');
        option.value = curator.id;
        option.textContent = curator.name;
        select.appendChild(option);
      });
    } catch (error) {
      console.error('App: Error loading curators for filter:', error);
    }
  }
  
  /**
   * Load concepts for filter dropdown
   */
  async loadConceptsForFilter() {
    try {
      const categories = await restaurantRepository.getAllConceptCategories();
      const select = document.getElementById('filterConcepts');
      
      // Clear existing options except first
      while (select.options.length > 1) {
        select.remove(1);
      }
      
      // Add category options
      categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        select.appendChild(option);
      });
    } catch (error) {
      console.error('App: Error loading concepts for filter:', error);
    }
  }
  
  /**
   * Update the sync status display
   */
  async updateSyncStatus() {
    try {
      const lastSyncTime = await settingsService.getLastSyncTime();
      const syncStatusEl = document.getElementById('syncStatus');
      
      if (lastSyncTime) {
        const date = new Date(lastSyncTime);
        syncStatusEl.textContent = `Last sync: ${date.toLocaleString()}`;
      } else {
        syncStatusEl.textContent = 'Last sync: Never';
      }
    } catch (error) {
      console.error('App: Error updating sync status:', error);
    }
  }
  
  /**
   * Perform a manual sync
   */
  async performManualSync() {
    try {
      const syncBtn = document.getElementById('syncNowBtn');
      syncBtn.disabled = true;
      syncBtn.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Syncing...';
      
      // Show toast
      this.showInfo('Syncing with server...');
      
      // Perform sync
      const results = await autoSyncService.performManualSync();
      
      // Update UI
      await this.updateSyncStatus();
      await this.loadRestaurants();
      
      // Show results
      this.showSuccess(`Sync completed: ${results.importRestaurants.added} added, ${results.importRestaurants.updated} updated`);
    } catch (error) {
      console.error('App: Error performing manual sync:', error);
      this.showError('Sync failed. Please try again.');
    } finally {
      const syncBtn = document.getElementById('syncNowBtn');
      syncBtn.disabled = false;
      syncBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Sync Now';
    }
  }
  
  /**
   * Setup initial view based on URL hash
   */
  setupView() {
    // Get view from hash or default to restaurants
    const hash = window.location.hash.substring(1);
    const view = hash || 'restaurants';
    
    // Change to view
    this.changeView(view);
    
    // Set up hash change listener
    window.addEventListener('hashchange', () => {
      const newHash = window.location.hash.substring(1);
      if (newHash) {
        this.changeView(newHash);
      }
    });
  }
  
  /**
   * Load and display curators
   */
  async loadCurators() {
    try {
      console.log('App: Loading curators');
      
      // Show loader
      const container = document.getElementById('curatorsList');
      container.innerHTML = `
        <div class="loader">
          <div class="spinner"></div>
          <span>Loading curators...</span>
        </div>
      `;
      
      // Get curators
      const curators = await curatorRepository.getAllCurators();
      
      if (curators.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <i class="fas fa-users empty-icon"></i>
            <h3>No curators found</h3>
            <p>Add a new curator to get started.</p>
            <button id="emptyCuratorAddBtn" class="btn btn-primary">
              <i class="fas fa-plus"></i>
              Add Curator
            </button>
          </div>
        `;
        
        document.getElementById('emptyCuratorAddBtn').addEventListener('click', () => {
          this.showAddCuratorModal();
        });
      } else {
        this.renderCurators(curators);
      }
    } catch (error) {
      console.error('App: Error loading curators:', error);
      this.showError('Failed to load curators. Please try again.');
    }
  }
  
  /**
   * Render curators to the container
   * @param {Array} curators - Curators to render
   */
  renderCurators(curators) {
    const container = document.getElementById('curatorsList');
    
    // Create curator cards
    const html = curators.map(curator => {
      const isActive = this.currentCurator && curator.id === this.currentCurator.id;
      return `
        <div class="curator-card ${isActive ? 'active' : ''}">
          <div class="curator-header">
            <div class="curator-avatar">
              <i class="fas fa-user"></i>
            </div>
            <div class="curator-info">
              <h3 class="curator-name">${curator.name}</h3>
              <div class="curator-meta">
                <span>
                  <i class="fas fa-calendar"></i>
                  ${curator.lastActive ? new Date(curator.lastActive).toLocaleDateString() : 'Never used'}
                </span>
              </div>
            </div>
          </div>
          <div class="curator-actions">
            <div class="curator-status ${curator.origin === 'remote' ? 'remote' : 'active'}">
              <i class="fas ${curator.origin === 'remote' ? 'fa-cloud' : 'fa-check-circle'}"></i>
              ${curator.origin === 'remote' ? 'Remote' : 'Local'}
            </div>
            <button class="btn btn-secondary select-curator" data-id="${curator.id}">
              ${isActive ? 'Current' : 'Select'}
            </button>
          </div>
        </div>
      `;
    }).join('');
    
    container.innerHTML = html;
    
    // Add event listeners
    container.querySelectorAll('.select-curator').forEach(btn => {
      btn.addEventListener('click', async () => {
        const curatorId = parseInt(btn.dataset.id);
        await this.selectCurator(curatorId);
        this.loadCurators(); // Refresh list
      });
    });
  }
  
  /**
   * Show success message toast
   * @param {string} message - Message to show
   */
  showSuccess(message) {
    if (typeof Toastify !== 'undefined') {
      Toastify({
        text: message,
        duration: 3000,
        gravity: "top",
        position: "right",
        style: { background: "linear-gradient(to right, #00b09b, #96c93d)" }
      }).showToast();
    } else {
      console.log('Success:', message);
    }
  }
  
  /**
   * Show error message toast
   * @param {string} message - Message to show
   */
  showError(message) {
    if (typeof Toastify !== 'undefined') {
      Toastify({
        text: message,
        duration: 4000,
        gravity: "top",
        position: "right",
        style: { background: "linear-gradient(to right, #ff5f6d, #ffc371)" }
      }).showToast();
    } else {
      console.error('Error:', message);
      alert(message);
    }
  }
  
  /**
   * Show info message toast
   * @param {string} message - Message to show
   */
  showInfo(message) {
    if (typeof Toastify !== 'undefined') {
      Toastify({
        text: message,
        duration: 3000,
        gravity: "top",
        position: "right",
        style: { background: "linear-gradient(to right, #2193b0, #6dd5ed)" }
      }).showToast();
    } else {
      console.log('Info:', message);
    }
  }

  /**
   * Load and display concepts
   */
  async loadConcepts() {
    try {
      console.log('App: Loading concepts');
      
      // Show loader
      const container = document.getElementById('conceptsGrid');
      container.innerHTML = `
        <div class="loader">
          <div class="spinner"></div>
          <span>Loading concepts...</span>
        </div>
      `;
      
      // Get all concept categories
      const categories = await restaurantRepository.getAllConceptCategories();
      
      // If no categories, show empty state
      if (categories.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <i class="fas fa-tags empty-icon"></i>
            <h3>No concepts found</h3>
            <p>Add concepts to restaurants to organize your data.</p>
          </div>
        `;
        return;
      }
      
      // Get the values for each category
      const conceptsByCategory = {};
      for (const category of categories) {
        const values = await restaurantRepository.getConceptValuesByCategory(category);
        conceptsByCategory[category] = values;
      }
      
      // Render concepts
      this.renderConcepts(conceptsByCategory);
    } catch (error) {
      console.error('App: Error loading concepts:', error);
      this.showError('Failed to load concepts. Please try again.');
    }
  }
  
  /**
   * Render concepts grouped by category
   * @param {Object} conceptsByCategory - Object with categories as keys and arrays of values
   */
  renderConcepts(conceptsByCategory) {
    const container = document.getElementById('conceptsGrid');
    
    // Create HTML for each category
    let html = '';
    
    for (const category in conceptsByCategory) {
      const values = conceptsByCategory[category];
      
      html += `
        <div class="concept-category">
          <div class="category-header">
            <h3 class="category-title">${category}</h3>
            <span class="category-count">${values.length} values</span>
          </div>
          <div class="category-values">
            ${values.map(value => `
              <div class="concept-value" data-category="${category}" data-value="${value}">
                <span class="value-text">${value}</span>
                <div class="value-actions">
                  <button class="btn-icon edit-concept" title="Edit">
                    <i class="fas fa-pencil-alt"></i>
                  </button>
                  <button class="btn-icon delete-concept" title="Delete">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
    
    // Update the container
    container.innerHTML = html;
    
    // Add event listeners for concept actions
    container.querySelectorAll('.edit-concept').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const conceptEl = e.target.closest('.concept-value');
        const category = conceptEl.dataset.category;
        const value = conceptEl.dataset.value;
        this.editConcept(category, value);
      });
    });
    
    container.querySelectorAll('.delete-concept').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const conceptEl = e.target.closest('.concept-value');
        const category = conceptEl.dataset.category;
        const value = conceptEl.dataset.value;
        this.confirmDeleteConcept(category, value);
      });
    });
    
    // Add event listener for category add button
    document.getElementById('addCategoryBtn').addEventListener('click', () => {
      this.showAddCategoryModal();
    });
  }
  
  /**
   * Edit a concept
   * @param {string} category - Concept category
   * @param {string} value - Concept value
   */
  editConcept(category, value) {
    // Functionality to edit a concept would go here
    console.log(`App: Editing concept ${category}:${value}`);
    
    // Show a message that this feature is not yet implemented
    this.showInfo('Concept editing will be implemented in a future update.');
  }
  
  /**
   * Show confirmation dialog for deleting a concept
   * @param {string} category - Concept category
   * @param {string} value - Concept value
   */
  confirmDeleteConcept(category, value) {
    // Set concept info in modal
    document.getElementById('deleteItemName').textContent = `concept "${value}" (${category})`;
    
    // Set data attributes to use in delete function
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    confirmBtn.dataset.itemType = 'concept';
    confirmBtn.dataset.category = category;
    confirmBtn.dataset.value = value;
    
    // Show modal
    document.getElementById('modalOverlay').classList.remove('hidden');
    document.getElementById('confirmDeleteModal').classList.remove('hidden');
  }
  
  /**
   * Show modal to add a new category
   */
  showAddCategoryModal() {
    // Functionality to add a new category would go here
    console.log('App: Showing add category modal');
    
    // Show a message that this feature is not yet implemented
    this.showInfo('Category management will be implemented in a future update.');
  }
  
  /**
   * Load analytics data
   */
  async loadAnalytics() {
    try {
      console.log('App: Loading analytics');
      
      // Show a message that this feature is coming soon
      this.showInfo('Analytics functionality will be available in a future update.');
      
      // For now, we can show some placeholder data
      document.getElementById('statTotalRestaurants').textContent = '15';
      document.getElementById('statTotalConcepts').textContent = '42';
      document.getElementById('statTotalCurators').textContent = '3';
      document.getElementById('statUnsyncedCount').textContent = '7';
      
    } catch (error) {
      console.error('App: Error loading analytics:', error);
    }
  }
  
  /**
   * Load settings page
   */
  async loadSettings() {
    try {
      console.log('App: Loading settings');
      
      // Load sync settings
      const syncSettings = await settingsService.getSyncSettings();
      document.getElementById('settingSyncInterval').value = syncSettings.syncIntervalMinutes;
      document.getElementById('settingSyncStartup').checked = syncSettings.syncOnStartup;
      
      // Load sync history
      const syncHistory = await settingsService.getSyncHistory();
      this.renderSyncHistory(syncHistory);
      
      // Set up save settings handler
      document.getElementById('saveSettingsBtn').addEventListener('click', () => {
        this.saveSettings();
      });
      
      // Set up data management handlers
      document.getElementById('exportDataBtn').addEventListener('click', () => {
        this.exportData();
      });
      
      document.getElementById('importDataBtn').addEventListener('click', () => {
        this.importData();
      });
      
      document.getElementById('resetDbBtn').addEventListener('click', () => {
        this.confirmResetDatabase();
      });
      
    } catch (error) {
      console.error('App: Error loading settings:', error);
      this.showError('Failed to load settings. Please try again.');
    }
  }
  
  /**
   * Render sync history in settings view
   * @param {Array} history - Array of sync history entries
   */
  renderSyncHistory(history) {
    const container = document.getElementById('syncHistoryList');
    
    if (!history || history.length === 0) {
      container.innerHTML = `<div class="empty-message">No sync history available</div>`;
      return;
    }
    
    const html = history.map(entry => {
      const date = new Date(entry.timestamp);
      const formattedDate = date.toLocaleString();
      const iconClass = entry.status === 'success' ? 'success' : 'error';
      
      return `
        <div class="history-item">
          <span class="history-icon ${iconClass}">
            <i class="fas ${entry.status === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
          </span>
          <div class="history-details">
            <span class="history-title">${entry.status === 'success' ? 'Sync completed' : 'Sync failed'}</span>
            <span class="history-time">${formattedDate}</span>
          </div>
          <span class="history-meta">${entry.message}</span>
        </div>
      `;
    }).join('');
    
    container.innerHTML = html;
  }
  
  /**
   * Save settings
   */
  async saveSettings() {
    try {
      const syncInterval = parseInt(document.getElementById('settingSyncInterval').value) || 30;
      const syncOnStartup = document.getElementById('settingSyncStartup').checked;
      
      await settingsService.updateSyncSettings({
        syncIntervalMinutes: syncInterval,
        syncOnStartup
      });
      
      // Update auto sync interval
      await autoSyncService.updateSyncInterval(syncInterval);
      
      this.showSuccess('Settings saved successfully');
    } catch (error) {
      console.error('App: Error saving settings:', error);
      this.showError('Failed to save settings. Please try again.');
    }
  }
  
  /**
   * Export database data
   */
  exportData() {
    this.showInfo('Export functionality will be implemented in a future update.');
  }
  
  /**
   * Import database data
   */
  importData() {
    this.showInfo('Import functionality will be implemented in a future update.');
  }
  
  /**
   * Confirm database reset
   */
  confirmResetDatabase() {
    // Set info in modal
    document.getElementById('deleteItemName').textContent = 'the entire database';
    
    // Set data attributes to use in delete function
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    confirmBtn.dataset.itemType = 'database';
    
    // Show modal
    document.getElementById('modalOverlay').classList.remove('hidden');
    document.getElementById('confirmDeleteModal').classList.remove('hidden');
    
    // Add one-time event listener for database reset
    confirmBtn.addEventListener('click', async () => {
      if (confirmBtn.dataset.itemType === 'database') {
        try {
          await databaseService.resetDatabase();
          this.showSuccess('Database has been reset successfully');
          
          // Reload the page after a brief delay
          setTimeout(() => window.location.reload(), 2000);
        } catch (error) {
          console.error('App: Error resetting database:', error);
          this.showError('Failed to reset database. Please try again.');
        }
      }
      
      this.closeAllModals();
    }, { once: true });
  }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});

export default App;
