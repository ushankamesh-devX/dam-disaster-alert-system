import React, { useState, useEffect } from 'react';
import { Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenLayout } from '@/components/ScreenLayout';
import { HazardCard } from '@/components/pages/Dashboard/HazardCard';
import { FloodRiskMap } from '@/components/pages/Dashboard/FloodRiskMap';
import { QuickActions } from '@/components/pages/Dashboard/QuickActions';

import { useTranslation } from 'react-i18next';

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
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

  const handleViewFullMap = () => {
    router.push('/(tabs)/hazard-map');
  };

  const handleGuidelines = () => {
    console.log('Guidelines pressed');
  };

  const handleShelterLocations = () => {
    console.log('Shelter Locations pressed');
  };

  const handleShareLocation = () => {
    console.log('Share My Location pressed');
  };

  const handleEmergencyContact = () => {
    console.log('Emergency Contact pressed');
  };

  return (
    <ScreenLayout
      title="FloodWatch"
      subtitle={t('stay_informed')}
    >
      <ScrollView className="flex-1 rounded-3xl" showsVerticalScrollIndicator={false}>
        <HazardCard level={level} hazardValue={hazardValue} />

        <FloodRiskMap onViewFullMap={handleViewFullMap} />

        <QuickActions
          onGuidelines={handleGuidelines}
          onShelterLocations={handleShelterLocations}
          onShareLocation={handleShareLocation}
          onEmergencyContact={handleEmergencyContact}
        />

        {/* <Text className="text-gray-600 text-base mt-6 px-4 mb-6">
          Welcome to the Dam Disaster Alert System. Monitor water levels and receive real-time alerts.
        </Text> */}
      </ScrollView>

    </ScreenLayout>
  );
}
