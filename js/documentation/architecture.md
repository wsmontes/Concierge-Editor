# Concierge Editor Architecture

## Overview

The Concierge Editor application follows a layered architecture designed to separate concerns, improve maintainability, and enable testability. This document outlines the architectural approach and explains how components should interact.

## Architectural Layers

### 1. Storage Layer

The foundation of the application's data persistence.

- **StorageModule**: Low-level database abstraction using IndexedDB
  - Handles generic CRUD operations
  - No domain-specific knowledge
  - Transaction management
  - Import/Export functionality

#### Key Points:

- Direct use of StorageModule should be restricted to services
- UI components should never access StorageModule directly
- Provides a generic, reusable interface to IndexedDB

### 2. Service Layer

Domain-specific business logic and data management.

- **BaseService**: Foundation class for all entity services
- **Entity Services**:
  - **RestaurantService**: Restaurant management
  - **ConceptService**: Concept and category management
  - **ImageService**: Image upload and management
  - **LocationService**: Geographic data management
- **ServiceRegistry**: Central access point for all services

#### Key Points:

- Services encapsulate domain knowledge
- Each service is responsible for a specific domain entity
- Services handle relationships between entities

### 3. Business Logic Layer

High-level operations that coordinate multiple services.

- **BusinessLogicModule**: Coordinates complex operations
  - Analytics and reporting
  - Import/export workflows
  - Data migration
  - Multi-entity operations

#### Key Points:

- Implements use cases that span multiple domain entities
- Provides application-level functionality
- Orchestrates service operations

### 4. UI Layer

User interface components and interactions.

- **UIUtils**: Helpers for UI components
- **UI Components**: Individual screens and elements
- **ErrorHandlingService**: Error management
- **ValidationService**: Data validation

#### Key Points:

- UI components should use services via ServiceRegistry
- Use UIUtils for common operations
- Handle errors consistently using ErrorHandlingService
- Validate data with ValidationService before saving

## How to Use This Architecture

### For UI Components

1. **Access Services**: Use ServiceRegistry to get services
   ```javascript
   const restaurantService = ServiceRegistry.getRestaurantService();
   ```

2. **Use UIUtils for Common Operations**:
   ```javascript
   const restaurantData = await UIUtils.loadRestaurantData(restaurantId);
   ```

3. **Validate Data Before Saving**:
   ```javascript
   const validationResult = ValidationService.validateRestaurant(formData);
   if (!validationResult.valid) {
     // Handle validation errors
   }
   ```

4. **Handle Errors Consistently**:
   ```javascript
   try {
     await restaurantService.deleteWithRelations(id);
   } catch (error) {
     ErrorHandlingService.handleError(error, 'Deleting restaurant');
   }
   ```

### For Backend Operations

1. **Use Services for Domain Operations**:
   ```javascript
   const restaurant = await restaurantService.getWithRelations(id);
   ```

2. **Use BusinessLogicModule for Complex Operations**:
   ```javascript
   const stats = await BusinessLogicModule.getApplicationStatistics();
   ```

## Legacy Support

The application includes legacy modules to ensure backward compatibility:

- **DataAccessUtil**: Redirects to appropriate services
- **DataModule**: Delegates to BusinessLogicModule

These modules should be considered deprecated, and new code should use the service architecture directly.

## Adding New Features

When adding new features:

1. Determine which domain entity is affected
2. Use or extend the appropriate service
3. For cross-entity features, use BusinessLogicModule
4. Update UI components to use the service via ServiceRegistry

## Testing

This architecture enables better testing:

- **Unit Tests**: Test services in isolation
- **Integration Tests**: Test service interactions
- **UI Tests**: Test UI components with mocked services

## Future Improvements

Planned architectural improvements:

1. State management for UI components
2. Enhanced error tracking and reporting
3. Offline synchronization mechanism
4. Performance optimizations for large datasets
