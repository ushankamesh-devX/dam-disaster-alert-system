import { Tabs } from 'expo-router';
import React from 'react';

import { CustomTabBar } from '@/components/CustomTabBar';

export default function TabLayout() {
  return (
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
  );
}
