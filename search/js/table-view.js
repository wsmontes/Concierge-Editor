/**
 * table-view.js
 * 
 * Purpose: Provides ways to show search results in table format
 * Manages table rendering, sorting, and interaction events
 * 
 * Dependencies: None - Pure JavaScript UI component
 */

class TableView {
    /**
     * Creates a new TableView instance
     * @param {string} containerId - ID of the element to contain the table
     */
    constructor(containerId) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.table = null;
        this.columns = [];
        this.data = [];
        this.options = {};
        this.hasRendered = false;
    }
    
    /**
     * Renders the table with columns and data
     * @param {Array} columns - Column definitions
     * @param {Array} data - Data to display in the table
     * @param {Object} options - Table options
     */
    render(columns, data, options = {}) {
        this.columns = columns;
        this.data = data;
        this.options = options;
        
        // Create container if not exists
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = this.containerId;
            document.body.appendChild(this.container);
        } else {
            // Clear the container
            this.container.innerHTML = '';
        }
        
        // Create the table
        this.table = document.createElement('table');
        this.table.className = 'search-table';
        
        // Create header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        this.columns.forEach(column => {
            const th = document.createElement('th');
            th.textContent = column.title || column.field;
            
            if (column.width) {
                th.style.width = column.width;
            }
            
            // Add sort indicator if column is sortable and is the current sort field
            if (options.sortField && options.sortField === column.field) {
                th.classList.add('sort-indicator');
                if (options.sortDirection && options.sortDirection === 'desc') {
                    th.classList.add('desc');
                } else {
                    th.classList.add('asc');
                }
            }
            
            // Add sorting capability
            if (options.onSort) {
                th.addEventListener('click', () => {
                    let direction = 'asc';
                    if (options.sortField === column.field) {
                        // Toggle direction if already sorting by this column
                        direction = options.sortDirection === 'asc' ? 'desc' : 'asc';
                    }
                    options.onSort(column.field, direction);
                });
                th.style.cursor = 'pointer';
            }
            
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        this.table.appendChild(thead);
        
        // Create body
        const tbody = document.createElement('tbody');
        
        if (data.length === 0) {
            // Create an empty row with message
            const emptyRow = document.createElement('tr');
            const emptyCell = document.createElement('td');
            emptyCell.colSpan = columns.length;
            emptyCell.textContent = 'No data available';
            emptyCell.style.textAlign = 'center';
            emptyCell.style.padding = '20px';
            emptyRow.appendChild(emptyCell);
            tbody.appendChild(emptyRow);
        } else {
            // Create data rows
            data.forEach(item => {
                const row = document.createElement('tr');
                
                this.columns.forEach(column => {
                    const td = document.createElement('td');
                    const value = item[column.field];
                    
                    // Handle special rendering for certain fields
                    if (column.field === 'primaryPhoto' && value) {
                        const img = document.createElement('img');
                        img.src = value;
                        img.alt = item.name || 'thumbnail';
                        img.onerror = () => {
                            img.src = 'https://via.placeholder.com/40?text=No+Image';
                        };
                        td.appendChild(img);
                    } else if (column.field === 'timestamp' && value) {
                        // Format timestamps
                        td.textContent = new Date(value).toLocaleDateString();
                    } else if (column.field === 'lastActive' && value) {
                        // Format lastActive
                        td.textContent = new Date(value).toLocaleDateString();
                    } else {
                        // Regular text value
                        td.textContent = value !== undefined ? value : '';
                    }
                    
                    row.appendChild(td);
                });
                
                // Add row click event if specified
                if (options.onRowClick) {
                    row.addEventListener('click', (event) => {
                        options.onRowClick(item, event);
                    });
                    row.style.cursor = 'pointer';
                }
                
                tbody.appendChild(row);
            });
        }
        
        this.table.appendChild(tbody);
        this.container.appendChild(this.table);
        this.hasRendered = true;
    }
    
    /**
     * Clears the table content
     */
    clear() {
        if (this.container) {
            this.container.innerHTML = '';
        }
        this.data = [];
        this.hasRendered = false;
    }
    
    /**
     * Updates one row in the table
     * @param {number|string} id - ID of the row to update
     * @param {Object} newData - New data for the row
     */
    updateRow(id, newData) {
        if (!this.table || !this.data) return;
        
        // Find the data item
        const index = this.data.findIndex(item => item.id === id);
        if (index === -1) return;
        
        // Update the data
        this.data[index] = { ...this.data[index], ...newData };
        
        // Re-render the table
        this.render(this.columns, this.data, this.options);
    }
    
    /**
     * Adds a new row to the table
     * @param {Object} rowData - Data for the new row
     */
    addRow(rowData) {
        if (!this.data) this.data = [];
        
        // Add the row to data
        this.data.push(rowData);
        
        // Re-render the table
        this.render(this.columns, this.data, this.options);
    }
    
    /**
     * Removes a row from the table
     * @param {number|string} id - ID of the row to remove
     */
    removeRow(id) {
        if (!this.data) return;
        
        // Filter out the row
        this.data = this.data.filter(item => item.id !== id);
        
        // Re-render the table
        this.render(this.columns, this.data, this.options);
    }
    
    /**
     * Checks if the table has data
     * @returns {boolean} True if the table has data
     */
    hasData() {
        return this.hasRendered && Array.isArray(this.data) && this.data.length > 0;
    }
    
    /**
     * Gets the current table data
     * @returns {Array} Current table data
     */
    getData() {
        return this.data;
    }
}
