import { Tabs } from 'expo-router';
import React from 'react';

import { CustomTabBar } from '@/components/CustomTabBar';
import { AlertsProvider } from '@/components/alerts/AlertsContext';
import { IncomingAlert } from '@/components/alerts/AlertSheet';
import { ResponderApp } from '@/components/responder/ResponderApp';
import { useAuth } from '@/contexts/AuthContext';

export default function TabLayout() {
  const { user } = useAuth();
  // Demo response teams get their own screens: missions, route to the person, Accept / Arrived / Rescued
  if (user?.role?.code === 'RESPONDER') return <ResponderApp />;

  return (
    // Watches for new alerts on every tab and pops them up (Expo Go has no remote push)
    <AlertsProvider>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Dashboard',
            tabBarLabel: 'Home',
          }}
        />
        <Tabs.Screen
          name="news"
          options={{
            title: 'News',
          }}
        />
        <Tabs.Screen
          name="emergency"
          options={{
            title: 'Emergency Contact',
            tabBarLabel: 'Emergency',
          }}
        />
        <Tabs.Screen
          name="alerts"
          options={{
            title: 'Alerts',
          }}
        />
        <Tabs.Screen
          name="report"
          options={{
            title: 'Report Issues',
            tabBarLabel: 'Reports',
          }}
        />
        <Tabs.Screen
          name="hazard-map"
          options={{
            title: 'Hazard Map',
            href: null,
          }}
        />

      </Tabs>
      <IncomingAlert />
    </AlertsProvider>
  );
}
