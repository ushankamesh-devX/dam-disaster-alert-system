import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScreenLayout } from '@/components/ScreenLayout';
import { HazardBanner } from '@/components/pages/Hazardmap/HazardBanner';
import { FullMapView } from '@/components/pages/Hazardmap/FullMapView';
import { QuickActions } from '@/components/pages/Hazardmap/QuickActions';
import FakeCallScreen from '@/components/Emergency Contact/FakeCallScreen';

export default function HazardMapScreen() {
  const router = useRouter();
  const [showFakeCall, setShowFakeCall] = useState(false);

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

  const handleAnswerCall = () => {
    console.log('Emergency call answered');
    setShowFakeCall(false);
    // TODO: Add logic to dial emergency number or show emergency info
  };

  const handleDeclineCall = () => {
    console.log('Emergency call declined');
    setShowFakeCall(false);
  };

  const triggerTestCall = () => {
    setShowFakeCall(true);
  };

  return (
    <ScreenLayout
      title="Hazard Map"
      subtitle="View flood risk zones and evacuation routes"
    >
      <ScrollView className="flex-1 rounded-2xl" showsVerticalScrollIndicator={false}>
        {/* Back Button */}
        <View className="flex-row items-center justify-between mb-3">
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Back to Dashboard"
            onPress={() => router.replace('/')}
            className="h-10 w-16 items-center justify-center rounded-full bg-gray-100"
          >
            <MaterialCommunityIcons name="arrow-left" size={22} color="#111827" />
          </TouchableOpacity>
        </View>

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

      {/* Fake Call Screen */}
      <FakeCallScreen
        visible={showFakeCall}
        onAnswer={handleAnswerCall}
        onDecline={handleDeclineCall}
        callerName="Emergency Alert System"
        callerNumber="108"
        emergencyType="Dam Emergency Alert"
      />

      {/* Test Trigger Button - Floating */}
      <TouchableOpacity
        style={styles.testButton}
        onPress={triggerTestCall}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="phone-alert" size={24} color="#fff" />
        <Text style={styles.testButtonText}>Test Call</Text>
      </TouchableOpacity>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  testButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#ff3b30',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
