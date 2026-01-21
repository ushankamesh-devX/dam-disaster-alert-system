import React from 'react';
import { View, ScrollView } from 'react-native';
import { ScreenLayout } from '@/components/ScreenLayout';
import { HazardBanner } from '@/components/pages/Hazardmap/HazardBanner';
import { FullMapView } from '@/components/pages/Hazardmap/FullMapView';
import { QuickActions } from '@/components/pages/Hazardmap/QuickActions';

export default function HazardMapScreen() {
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
      title="Hazard Map" 
      subtitle="View flood risk zones and evacuation routes"
    >
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Hazard Banner */}
        <HazardBanner />

        {/* Full Map View with Gauge and Legend */}
        <View className="flex-1 mb-4 mt-4" style={{ minHeight: 500 }}>
          <FullMapView />
        </View>

        {/* Quick Actions */}
        <QuickActions
          onGuidelines={handleGuidelines}
          onShelterLocations={handleShelterLocations}
          onShareLocation={handleShareLocation}
          onEmergencyContact={handleEmergencyContact}
        />

        {/* Bottom spacing */}
        <View className="h-6" />
      </ScrollView>
    </ScreenLayout>
  );
}
