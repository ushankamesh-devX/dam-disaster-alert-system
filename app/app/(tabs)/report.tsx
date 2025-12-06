import React from 'react';
import { Text } from 'react-native';
import { ScreenLayout } from '@/components/ScreenLayout';

export default function ReportScreen() {
  return (
    <ScreenLayout 
      title="Report Issues" 
      subtitle="Submit safety concerns and observations"
    >
      <Text className="text-gray-600 text-base">
        Report any issues or concerns related to dam safety.
      </Text>
    </ScreenLayout>
  );
}
