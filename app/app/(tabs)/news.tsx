import React from 'react';
import { Text } from 'react-native';
import { ScreenLayout } from '@/components/ScreenLayout';

export default function NewsScreen() {
  return (
    <ScreenLayout 
      title="News Feed" 
      subtitle="Latest updates on dam safety and weather"
    >
      <Text className="text-gray-600 text-base">
        Latest updates and news regarding dam safety and weather conditions.
      </Text>
    </ScreenLayout>
  );
}
