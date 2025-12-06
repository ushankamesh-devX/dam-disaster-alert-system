import React from 'react';
import { Text } from 'react-native';
import { ScreenLayout } from '@/components/ScreenLayout';

export default function EmergencyScreen() {
  return (
    <ScreenLayout 
      title="Emergency" 
      subtitle="Quick access to emergency contacts"
    >
      <Text className="text-gray-600 text-base">
        Quick access to emergency contacts and authorities.
      </Text>
    </ScreenLayout>
  );
}
