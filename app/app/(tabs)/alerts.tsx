import React from 'react';
import { Text } from 'react-native';
import { ScreenLayout } from '@/components/ScreenLayout';

export default function AlertsScreen() {
  return (
    <ScreenLayout 
      title="Alerts" 
      subtitle="Real-time warnings and notifications"
    >
      <Text className="text-gray-600 text-base">
        Active alerts and warnings will be displayed here.
      </Text>
    </ScreenLayout>
  );
}
