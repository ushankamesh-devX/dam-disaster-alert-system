import React, { useState, useEffect } from 'react';
import { Text, ScrollView } from 'react-native';
import { ScreenLayout } from '@/components/ScreenLayout';
import { HazardCard } from '@/components/Dashboard/HazardCard';

export default function HomeScreen() {
  const [level, setLevel] = useState(75);
  const [hazardValue, setHazardValue] = useState(">1.2 m²s");

  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate dynamic changes
      const newLevel = Math.floor(Math.random() * 40) + 60; // Random between 60 and 100
      setLevel(newLevel);
      setHazardValue(`>${(newLevel / 60).toFixed(1)} m²s`);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <ScreenLayout 
      title="FloodWatch" 
      subtitle="Stay informed with live updates on the dam"
    >
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <HazardCard level={level} hazardValue={hazardValue} />
        
        <Text className="text-gray-600 text-base mt-6 px-4">
          Welcome to the Dam Disaster Alert System. Monitor water levels and receive real-time alerts.
        </Text>
      </ScrollView>
    </ScreenLayout>
  );
}
