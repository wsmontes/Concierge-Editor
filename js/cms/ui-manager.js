/**
 * ui-manager.js
 * 
 * Purpose: Manages UI components and interactions across the application.
 * Provides utilities for showing modals, toasts, and updating UI elements.
 * 
 * Dependencies: Bootstrap for components
 */

const UIManager = (() => {
    // Keep track of modals and toasts
    let currentModal = null;
    let toastCounter = 0;
    
    /**
     * Initializes UI components
     */
    const initialize = () => {
        // Set up dynamic modal handlers
        document.getElementById('appModal').addEventListener('hidden.bs.modal', () => {
            // Clean up when modal is hidden
            document.getElementById('modalContent').innerHTML = '';
            document.getElementById('modalFooter').innerHTML = '';
            if (currentModal && currentModal.onClose) {
                currentModal.onClose();
            }
            currentModal = null;
        });
    };

    /**
     * Shows a modal with specified content and options
     * @param {Object} options Modal configuration
     */
    const showModal = (options) => {
        // Default options
        const config = {
            title: 'Modal Title',
            content: '',
            size: 'default', // default, lg, sm, xl, fullscreen
            buttons: [
                {
                    text: 'Close',
                    type: 'secondary',
                    action: 'close'
                }
            ],
            onClose: null,
            ...options
        };
        
        // Set modal title
        document.getElementById('modalTitle').textContent = config.title;
        
        // Set modal content
        if (typeof config.content === 'string') {
            document.getElementById('modalContent').innerHTML = config.content;
        } else if (config.content instanceof Element) {
            document.getElementById('modalContent').innerHTML = '';
            document.getElementById('modalContent').appendChild(config.content);
        }
        
        // Set modal size
        const modalDialog = document.querySelector('#appModal .modal-dialog');
        modalDialog.className = 'modal-dialog modal-dialog-centered';
        
        if (config.size === 'lg') {
            modalDialog.classList.add('modal-lg');
        } else if (config.size === 'sm') {
            modalDialog.classList.add('modal-sm');
        } else if (config.size === 'xl') {
            modalDialog.classList.add('modal-xl');
        } else if (config.size === 'fullscreen') {
            modalDialog.classList.add('modal-fullscreen');
        }
        
        // Add buttons
        const modalFooter = document.getElementById('modalFooter');
        modalFooter.innerHTML = '';
        
        config.buttons.forEach(button => {
            const btnElement = document.createElement('button');
            btnElement.type = 'button';
            btnElement.className = `btn btn-${button.type || 'secondary'}`;
            btnElement.textContent = button.text;
            
            if (button.action === 'close') {
                btnElement.dataset.bsDismiss = 'modal';
            } else if (typeof button.action === 'function') {
                btnElement.addEventListener('click', () => button.action(btnElement));
            }
            
            modalFooter.appendChild(btnElement);
        });
        
        // Store current modal config
        currentModal = config;
        
        // Show modal
        const modalElement = document.getElementById('appModal');
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
    };

    /**
     * Shows a toast notification
     * @param {string} type Alert type (success, danger, warning, info)
     * @param {string} title Toast title
     * @param {string} message Toast message
     * @param {number} duration Duration in milliseconds (default 5000)
     */
    const showToast = (type, title, message, duration = 5000) => {
        const toastId = `toast-${Date.now()}-${toastCounter++}`;
        const toastContainer = document.getElementById('toastContainer');
        
        const toastHTML = `
            <div class="toast" id="${toastId}" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="toast-header">
                    <span class="me-auto text-${type} fw-bold">${title}</span>
                    <small>Just now</small>
                    <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
                <div class="toast-body">
                    ${message}
                </div>
            </div>
        `;
        
        toastContainer.insertAdjacentHTML('beforeend', toastHTML);
        
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement, {
            autohide: true,
            delay: duration
        });
        
        toast.show();
        
        // Remove from DOM after hiding
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    };

    /**
     * Updates the database status indicator
     * @param {string} status Status type (connecting, connected, error)
     * @param {string} message Status message
     */
    const updateDatabaseStatus = (status, message) => {
        const indicator = document.getElementById('dbStatusIndicator');
        const text = document.getElementById('dbStatusText');
        
        indicator.className = 'status-indicator';
        if (status === 'connected') {
            indicator.classList.add('connected');
        } else if (status === 'error') {
            indicator.classList.add('error');
        }
        
        text.textContent = message;
    };

    /**
     * Creates a form from a schema
     * @param {Object} schema Form schema definition
     * @param {Object} values Initial values
     * @returns {HTMLElement} Form element
     */
    const createForm = (schema, values = {}) => {
        const form = document.createElement('form');
        form.className = 'needs-validation';
        form.noValidate = true;
        
        schema.fields.forEach(field => {
            const formGroup = document.createElement('div');
            formGroup.className = 'mb-3';
            
            // Create label
            const label = document.createElement('label');
            label.className = 'form-label';
            label.htmlFor = field.id;
            label.textContent = field.label;
            
            if (field.required) {
                const requiredMark = document.createElement('span');
                requiredMark.className = 'text-danger ms-1';
                requiredMark.textContent = '*';
                label.appendChild(requiredMark);
            }
            
            formGroup.appendChild(label);
            
            // Create input/control based on type
            let inputElement;
            
            switch (field.type) {
                case 'text':
                case 'email':
                case 'password':
                case 'number':
                case 'url':
                case 'tel':
                case 'date':
                    inputElement = document.createElement('input');
                    inputElement.type = field.type;
                    inputElement.className = 'form-control';
                    break;
                    
                case 'textarea':
                    inputElement = document.createElement('textarea');
                    inputElement.className = 'form-control';
                    inputElement.rows = field.rows || 3;
                    break;
                    
                case 'select':
                    inputElement = document.createElement('select');
                    inputElement.className = 'form-select';
                    
                    // Add default empty option
                    const defaultOption = document.createElement('option');
                    defaultOption.value = '';
                    defaultOption.textContent = `Select ${field.label}...`;
                    defaultOption.selected = !values[field.id];
                    inputElement.appendChild(defaultOption);
                    
                    // Add options
                    if (field.options) {
                        field.options.forEach(option => {
                            const optionElement = document.createElement('option');
                            optionElement.value = option.value;
                            optionElement.textContent = option.label;
                            
                            if (values[field.id] === option.value) {
                                optionElement.selected = true;
                            }
                            
                            inputElement.appendChild(optionElement);
                        });
                    }
                    break;
                    
                case 'checkbox':
                    const checkWrapper = document.createElement('div');
                    checkWrapper.className = 'form-check';
                    
                    inputElement = document.createElement('input');
                    inputElement.type = 'checkbox';
                    inputElement.className = 'form-check-input';
                    inputElement.checked = values[field.id] || false;
                    
                    const checkLabel = document.createElement('label');
                    checkLabel.className = 'form-check-label';
                    checkLabel.htmlFor = field.id;
                    checkLabel.textContent = field.checkLabel || field.label;
                    
                    checkWrapper.appendChild(inputElement);
                    checkWrapper.appendChild(checkLabel);
                    formGroup.appendChild(checkWrapper);
                    break;
                    
                case 'radio':
                    if (field.options) {
                        field.options.forEach((option, idx) => {
                            const radioWrapper = document.createElement('div');
                            radioWrapper.className = 'form-check';
                            
                            const radioInput = document.createElement('input');
                            radioInput.type = 'radio';
                            radioInput.className = 'form-check-input';
                            radioInput.name = field.id;
                            radioInput.id = `${field.id}_${idx}`;
                            radioInput.value = option.value;
                            radioInput.checked = values[field.id] === option.value;
                            
                            const radioLabel = document.createElement('label');
                            radioLabel.className = 'form-check-label';
                            radioLabel.htmlFor = `${field.id}_${idx}`;
                            radioLabel.textContent = option.label;
                            
                            radioWrapper.appendChild(radioInput);
                            radioWrapper.appendChild(radioLabel);
                            formGroup.appendChild(radioWrapper);
                        });
                        return formGroup;
                    }
                    break;
            }
            
            // Set common attributes
            if (inputElement) {
                inputElement.id = field.id;
                inputElement.name = field.id;
                inputElement.placeholder = field.placeholder || '';
                inputElement.value = values[field.id] !== undefined ? values[field.id] : '';
                inputElement.required = field.required || false;
                
                if (field.readonly) {
                    inputElement.readOnly = true;
                }
                
                if (field.min !== undefined) {
                    inputElement.min = field.min;
                }
                
                if (field.max !== undefined) {
                    inputElement.max = field.max;
                }
                
                if (field.pattern) {
                    inputElement.pattern = field.pattern;
                }
                
                // Only append input directly if not a checkbox (already appended)
                if (field.type !== 'checkbox') {
                    formGroup.appendChild(inputElement);
                }
                
                // Add validation feedback
                if (field.required) {
                    const invalidFeedback = document.createElement('div');
                    invalidFeedback.className = 'invalid-feedback';
                    invalidFeedback.textContent = field.errorMessage || 'This field is required';
                    formGroup.appendChild(invalidFeedback);
                }
                
                // Add help text if provided
                if (field.helpText) {
                    const helpText = document.createElement('div');
                    helpText.className = 'form-text';
                    helpText.textContent = field.helpText;
                    formGroup.appendChild(helpText);
                }
            }
            
            form.appendChild(formGroup);
        });
        
        return form;
    };

    /**
     * Gets values from a form
     * @param {HTMLFormElement} form The form element
     * @returns {Object} Form values
     */
    const getFormValues = (form) => {
        const formData = new FormData(form);
        const values = {};
        
        for (const [key, value] of formData.entries()) {
            values[key] = value;
        }
        
        // Handle checkboxes
        form.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            values[checkbox.name] = checkbox.checked;
        });
        
        return values;
    };

    /**
     * Validates a form
     * @param {HTMLFormElement} form The form element
     * @returns {boolean} True if valid
     */
    const validateForm = (form) => {
        form.classList.add('was-validated');
        return form.checkValidity();
    };

    /**
     * Creates a loading spinner
     * @returns {HTMLElement} Spinner element
     */
    const createLoadingSpinner = () => {
        const spinner = document.createElement('div');
        spinner.className = 'd-flex justify-content-center my-5';
        spinner.innerHTML = '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>';
        return spinner;
    };

    /**
     * Creates a placeholder element
     * @param {string} message Message to display
     * @param {string} icon Icon class name
     * @returns {HTMLElement} Placeholder element
     */
    const createPlaceholder = (message, icon = 'bi-info-circle') => {
        const placeholder = document.createElement('div');
        placeholder.className = 'text-center my-5 py-5';
        placeholder.innerHTML = `
            <i class="bi ${icon}" style="font-size: 3rem; opacity: 0.3;"></i>
            <p class="mt-3 text-muted">${message}</p>
        `;
        return placeholder;
    };

    /**
     * Updates the page title
     * @param {string} title Page title
     */
    const setPageTitle = (title) => {
        document.title = `${title} - Concierge Editor CMS`;
    };

    return {
        initialize,
        showModal,
        showToast,
        updateDatabaseStatus,
        createForm,
        getFormValues,
        validateForm,
        createLoadingSpinner,
        createPlaceholder,
        setPageTitle
    };
})();
