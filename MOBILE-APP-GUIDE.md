# Mobile App Guide - Dam Disaster Alert System

Complete guide for the React Native/Expo mobile application development, features, and deployment.

## Table of Contents

1. [Mobile App Overview](#mobile-app-overview)
2. [Getting Started](#getting-started)
3. [Project Structure](#project-structure)
4. [Core Features](#core-features)
5. [Navigation](#navigation)
6. [API Integration](#api-integration)
7. [State Management](#state-management)
8. [UI Components](#ui-components)
9. [Authentication](#authentication)
10. [Push Notifications](#push-notifications)
11. [Testing](#testing)
12. [Deployment](#deployment)

## Mobile App Overview

### Platform Support

- **iOS**: iOS 13+ (via Expo)
- **Android**: Android 6.0+ (API 23+)
- **Framework**: React Native with Expo
- **Language**: TypeScript/JavaScript
- **Styling**: NativeWind (Tailwind for React Native)

### Key Features

- Real-time dam monitoring
- Push notifications for critical alerts
- User authentication
- Role-based access control
- Offline capability (limited)
- Responsive design
- Dark mode support

### App Statistics

```
Estimated App Size: 50-100 MB
Minimum RAM Required: 2 GB
Supported Languages: English
Permissions Required: Location, Camera, Push Notifications
```

## Getting Started

### Prerequisites

```bash
# Check Node.js version (16+)
node --version
npm --version

# Install Expo CLI
npm install -g expo-cli

# Verify Expo installation
expo --version
```

### Quick Setup

```bash
# Navigate to app directory
cd app

# Install dependencies
npm install

# Start development server
npx expo start

# Run on platform
# Press 'i' for iOS
# Press 'a' for Android
# Press 'w' for web
```

### Development Environment

**Option 1: Using Expo Go (Recommended for Beginners)**

```bash
# Install Expo Go on your device (iOS App Store or Google Play)
# Scan QR code displayed after running expo start
```

**Option 2: Using Emulator**

```bash
# iOS Simulator (macOS only)
npx expo start --ios

# Android Emulator
npx expo start --android
```

**Option 3: Using Physical Device**

```bash
# Ensure device on same WiFi network
npx expo start --tunnel
# Scan QR code from device
```

## Project Structure

```
app/
├── app/                          # Navigation and screens
│   ├── _layout.tsx               # Root navigation layout
│   ├── modal.tsx                 # Modal screen
│   ├── settings.tsx              # Settings screen
│   └── (tabs)/                   # Tab-based navigation
│       ├── _layout.tsx           # Tab navigation layout
│       ├── index.tsx             # Home/Dashboard
│       ├── alerts.tsx            # Alerts screen
│       ├── dams.tsx              # Dams list
│       └── profile.tsx           # User profile
│
├── components/                   # Reusable components
│   ├── AlertCard.tsx             # Alert display component
│   ├── DamCard.tsx               # Dam information card
│   ├── SensorReadingChart.tsx    # Chart component
│   ├── LoadingSpinner.tsx        # Loading indicator
│   ├── ErrorBoundary.tsx         # Error handler
│   └── CustomHeader.tsx          # Header customization
│
├── services/                     # API and utility services
│   ├── api.ts                    # Axios/HTTP client
│   ├── auth.ts                   # Authentication service
│   ├── dams.ts                   # Dam-related API calls
│   ├── alerts.ts                 # Alert-related API calls
│   └── notifications.ts          # Push notification setup
│
├── store/                        # Redux or Context state
│   ├── actions/
│   │   ├── authActions.ts
│   │   ├── damActions.ts
│   │   └── alertActions.ts
│   ├── reducers/
│   │   ├── authReducer.ts
│   │   ├── damReducer.ts
│   │   └── alertReducer.ts
│   └── store.ts                  # Store configuration
│
├── hooks/                        # Custom React hooks
│   ├── useAuth.ts                # Authentication hook
│   ├── useDams.ts                # Dam data hook
│   ├── useAlerts.ts              # Alert data hook
│   └── usePushNotifications.ts   # Notification hook
│
├── constants/                    # App constants
│   ├── theme.ts                  # Color and style constants
│   ├── config.ts                 # App configuration
│   └── strings.ts                # Localization strings
│
├── models/                       # TypeScript interfaces
│   ├── Dam.ts
│   ├── Alert.ts
│   ├── Sensor.ts
│   └── User.ts
│
├── utils/                        # Utility functions
│   ├── formatting.ts             # Date, number formatting
│   ├── validation.ts             # Input validation
│   ├── storage.ts                # Local storage helpers
│   └── auth.ts                   # Token management
│
├── i18n/                         # Internationalization
│   └── translations.ts           # Translation strings
│
├── app.json                      # Expo configuration
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript configuration
├── tailwind.config.js            # Tailwind CSS config
├── nativewind-env.d.ts           # NativeWind types
└── metro.config.js               # Metro bundler config
```

## Core Features

### 1. Dashboard Screen

Displays real-time dam monitoring information.

```typescript
// app/(tabs)/index.tsx
import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text } from 'react-native';
import { useDams } from '@/hooks/useDams';
import DamCard from '@/components/DamCard';

export default function DashboardScreen() {
  const { dams, loading } = useDams();

  return (
    <ScrollView className="bg-slate-50">
      <View className="p-4">
        <Text className="text-2xl font-bold text-gray-900 mb-4">
          Dam Monitoring
        </Text>
        {loading ? (
          <LoadingSpinner />
        ) : (
          dams.map(dam => (
            <DamCard key={dam.id} dam={dam} />
          ))
        )}
      </View>
    </ScrollView>
  );
}
```

### 2. Alerts Screen

Shows active and historical alerts.

```typescript
// app/(tabs)/alerts.tsx
import React, { useEffect } from 'react';
import { FlatList, View, Text } from 'react-native';
import { useAlerts } from '@/hooks/useAlerts';
import AlertCard from '@/components/AlertCard';

export default function AlertsScreen() {
  const { alerts, loading, acknowledgeAlert } = useAlerts();

  const handleAcknowledge = async (alertId: number) => {
    await acknowledgeAlert(alertId);
  };

  return (
    <FlatList
      data={alerts}
      keyExtractor={item => item.id.toString()}
      renderItem={({ item }) => (
        <AlertCard 
          alert={item}
          onAcknowledge={handleAcknowledge}
        />
      )}
      contentContainerStyle={{ padding: 16 }}
    />
  );
}
```

### 3. Dam Details Screen

Detailed view with sensor data and charts.

```typescript
// app/dam/[id].tsx
import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { getDamDetails } from '@/services/dams';
import SensorReadingChart from '@/components/SensorReadingChart';

export default function DamDetailsScreen() {
  const { id } = useLocalSearchParams();
  const [dam, setDam] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDamDetails = async () => {
      try {
        const data = await getDamDetails(Number(id));
        setDam(data);
      } catch (error) {
        console.error('Error loading dam details:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDamDetails();
  }, [id]);

  if (loading) return <LoadingSpinner />;

  return (
    <ScrollView className="bg-white flex-1">
      <View className="p-4">
        <Text className="text-3xl font-bold text-gray-900 mb-2">
          {dam?.name}
        </Text>
        
        <View className="bg-blue-50 rounded-lg p-4 mb-4">
          <Text className="text-sm text-gray-600">Water Level</Text>
          <Text className="text-2xl font-bold text-blue-600">
            {dam?.currentLevel.toLocaleString()} m³
          </Text>
          <Text className="text-xs text-gray-500">
            {((dam?.currentLevel / dam?.maxLevel) * 100).toFixed(1)}% of capacity
          </Text>
        </View>

        {dam?.sensors && (
          <View>
            <Text className="text-lg font-bold text-gray-900 mb-3">
              Sensors
            </Text>
            {dam.sensors.map(sensor => (
              <SensorReadingChart key={sensor.id} sensor={sensor} />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
```

## Navigation

### Navigation Structure

```typescript
// app/_layout.tsx
import { Stack, Tabs } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="(auth)" 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="(tabs)" 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="dam/[id]" 
        options={{ title: 'Dam Details' }} 
      />
    </Stack>
  );
}

// app/(tabs)/_layout.tsx
export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          headerShown: true,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          headerShown: true,
        }}
      />
      <Tabs.Screen
        name="dams"
        options={{
          title: 'Dams',
          headerShown: true,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerShown: true,
        }}
      />
    </Tabs>
  );
}
```

## API Integration

### API Client Setup

```typescript
// services/api.ts
import axios, { AxiosInstance } from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
    });

    // Add request interceptor for token
    this.client.interceptors.request.use(async (config) => {
      const token = await SecureStore.getItemAsync('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Add response interceptor for errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized - refresh token or logout
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config?: any): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: any): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }
}

export default new ApiClient();
```

### Dam Service

```typescript
// services/dams.ts
import api from './api';

export interface Dam {
  id: number;
  name: string;
  currentLevel: number;
  maxLevel: number;
  minLevel: number;
  capacity: number;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
}

export const getDams = async (page = 0, size = 20): Promise<Dam[]> => {
  const response = await api.get(`/dams?page=${page}&size=${size}`);
  return response.data.content;
};

export const getDamDetails = async (damId: number): Promise<Dam> => {
  const response = await api.get(`/dams/${damId}`);
  return response.data;
};

export const getDamAlerts = async (damId: number): Promise<Alert[]> => {
  const response = await api.get(`/dams/${damId}/alerts`);
  return response.data;
};
```

## State Management

### Using Redux with Redux Toolkit

```typescript
// store/slices/authSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as SecureStore from 'expo-secure-store';

interface AuthState {
  token: string | null;
  user: User | null;
  loading: boolean;
  error: string | null;
}

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }) => {
    const response = await api.post('/auth/login', credentials);
    const { token } = response.data;
    await SecureStore.setItemAsync('authToken', token);
    return response.data;
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    token: null,
    user: null,
    loading: false,
    error: null,
  } as AuthState,
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Login failed';
      });
  },
});

export default authSlice.reducer;
```

## Authentication

### Login Flow

```typescript
// app/(auth)/login.tsx
import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text } from 'react-native';
import { useDispatch } from 'react-redux';
import { login } from '@/store/slices/authSlice';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();

  const handleLogin = async () => {
    setLoading(true);
    try {
      await dispatch(login({ email, password })).unwrap();
      // Navigation happens automatically via auth state
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 justify-center items-center bg-white p-4">
      <Text className="text-3xl font-bold text-gray-900 mb-8">
        DDAS
      </Text>
      
      <TextInput
        className="w-full border border-gray-300 rounded-lg p-3 mb-4"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        editable={!loading}
      />
      
      <TextInput
        className="w-full border border-gray-300 rounded-lg p-3 mb-6"
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!loading}
      />
      
      <TouchableOpacity
        className="w-full bg-blue-600 rounded-lg p-4"
        onPress={handleLogin}
        disabled={loading}
      >
        <Text className="text-white font-bold text-center">
          {loading ? 'Logging in...' : 'Login'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
```

## Push Notifications

### Setup Push Notifications

```typescript
// services/notifications.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const registerForPushNotifications = async () => {
  if (!Device.isDevice) {
    console.warn('Push notifications only work on physical devices');
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Failed to get push notification permissions');
    return;
  }

  const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
  if (!projectId) {
    throw new Error('EXPO_PUBLIC_PROJECT_ID is not set');
  }

  const pushTokenString = (
    await Notifications.getExpoPushTokenAsync({ projectId })
  ).data;

  return pushTokenString;
};

export const handleNotificationResponse = () => {
  Notifications.addNotificationResponseReceivedListener((response) => {
    const alertId = response.notification.request.content.data.alertId;
    // Navigate to alert details
  });
};
```

## Testing

### Unit Testing

```typescript
// __tests__/services/dams.test.ts
import { getDams } from '@/services/dams';
import api from '@/services/api';

jest.mock('@/services/api');

describe('Dam Service', () => {
  it('should fetch dams successfully', async () => {
    const mockDams = [
      { id: 1, name: 'Dam 1', currentLevel: 100 },
      { id: 2, name: 'Dam 2', currentLevel: 200 },
    ];

    (api.get as jest.Mock).mockResolvedValue({
      data: { content: mockDams },
    });

    const result = await getDams();
    expect(result).toEqual(mockDams);
  });
});
```

### Component Testing

```typescript
// __tests__/components/DamCard.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import DamCard from '@/components/DamCard';

describe('DamCard', () => {
  it('should display dam name', () => {
    const dam = { id: 1, name: 'Test Dam', currentLevel: 100 };
    render(<DamCard dam={dam} />);
    expect(screen.getByText('Test Dam')).toBeTruthy();
  });
});
```

## Deployment

### Build for iOS

```bash
# Build iOS app
eas build --platform ios

# Submit to App Store
eas submit --platform ios
```

### Build for Android

```bash
# Build Android app
eas build --platform android

# Submit to Google Play
eas submit --platform android
```

### Environment Configuration

Create `.env.production`:

```
EXPO_PUBLIC_API_URL=https://api.example.com/api
EXPO_PUBLIC_APP_NAME=Dam Disaster Alert
EXPO_PUBLIC_LOG_LEVEL=error
```

### Version Management

Update `app.json`:

```json
{
  "expo": {
    "name": "DDAS",
    "slug": "ddas",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.example.ddas",
      "buildNumber": "1"
    },
    "android": {
      "package": "com.example.ddas",
      "versionCode": 1
    }
  }
}
```

---

**Mobile apps bring monitoring to your pocket! 📱**

