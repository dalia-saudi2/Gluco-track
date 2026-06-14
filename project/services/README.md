# Dashboard Service

This service layer connects the React Native frontend to the FastAPI backend, providing data transformation and API integration.

## Usage

### Basic Setup

```typescript
import { dashboardService } from './services/dashboardService';
import { apiClient } from '../config/api';

// 1. Login first (or use stored token)
await apiClient.login('user@example.com', 'password');

// 2. Fetch dashboard data
const dashboardData = await dashboardService.getDashboardData();

// Use the transformed data
console.log(dashboardData.medications);      // Array of Medication objects
console.log(dashboardData.testResults);      // Array of TestResult objects
console.log(dashboardData.appointments);     // Array of Appointment objects
console.log(dashboardData.healthMetrics);   // Health metrics object
```

### Individual Data Fetching

```typescript
// Get medications only
const medications = await dashboardService.refreshMedications();

// Get appointments only
const appointments = await dashboardService.refreshAppointments();

// Get test results only
const testResults = await dashboardService.refreshTestResults();
```

### Data Transformation

The service automatically transforms backend data to match frontend expectations:

- **Medications**: Converts backend medication format to frontend format with calculated next dose times
- **Test Results**: Transforms medical records (lab type) to test result format
- **Appointments**: Formats appointment dates and times for display

### Error Handling

The service includes error handling and will throw errors that can be caught:

```typescript
try {
  const data = await dashboardService.getDashboardData();
} catch (error) {
  console.error('Failed to fetch data:', error);
  // Fallback to mock data or show error message
}
```

## API Client

The `apiClient` from `../config/api` provides direct access to backend endpoints:

```typescript
import { apiClient } from '../config/api';

// Authentication
await apiClient.login(email, password);
await apiClient.register(userData);
await apiClient.loginWithGoogle(idToken);

// Data fetching
await apiClient.getDashboard();
await apiClient.getAppointments();
await apiClient.getMedications();
await apiClient.getMedicalRecords();

// Creating data
await apiClient.createAppointment(appointmentData);
await apiClient.createMedication(medicationData);
await apiClient.createMedicalRecord(recordData);
```

## Configuration

Update the API base URL in `project/config/api.ts`:

```typescript
export const API_CONFIG = {
  BASE_URL: 'http://localhost:8000',  // Change for production
  // ...
};
```

For mobile devices, use your computer's IP address instead of localhost:
- Windows: `http://192.168.1.X:8000` (find IP with `ipconfig`)
- Mac/Linux: `http://192.168.1.X:8000` (find IP with `ifconfig`)
