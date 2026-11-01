import React, { useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Href, useRouter } from 'expo-router';
import { ScreenLayout } from '@/components/ScreenLayout';
import { FloodRiskMap } from '@/components/pages/Dashboard/FloodRiskMap';
import { QuickActions } from '@/components/pages/Dashboard/QuickActions';
import { GuidelinesModal } from '@/components/pages/Guidelines/GuidelinesModal';
import { useTranslation } from 'react-i18next';
import { mockGuidelines } from '@/data/mock-guidelines';
import { useAuth } from '@/contexts/AuthContext';
import { useDamDashboard } from '@/hooks/use-dam-dashboard';
import { DamOverview } from '@/components/pages/Dashboard/DamOverview';

export default function HomeScreen() {
  const { user } = useAuth();
  const preferredDamId = user?.preferredDamId;
  const router = useRouter();
  const { t } = useTranslation();
  const dashboard = useDamDashboard(preferredDamId);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [guidelinesVisible, setGuidelinesVisible] = useState(false);

  const handleViewFullMap = () => {
    router.push('/(tabs)/hazard-map');
  };

  const handleGuidelines = () => {
    setGuidelinesVisible(true);
  };

  const handleShelterLocations = () => {
    router.push('/(tabs)/emergency');
  };

  const handleShareLocation = () => {
    console.log('Share My Location pressed');
  };

  const handleEmergencyContact = () => {
    Linking.openURL('tel:117').catch(() => {});
  };

  return (
    <ScreenLayout
      title="FloodWatch"
      subtitle={t('stay_informed')}
    >
      <ScrollView
        className="flex-1 rounded-3xl"
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
        refreshControl={<RefreshControl refreshing={dashboard.loading} onRefresh={() => void dashboard.refresh()} tintColor="#0F766E" />}
      >
        <DamOverview {...dashboard} onRetry={() => void dashboard.refresh()} />

        <FloodRiskMap
          onViewFullMap={handleViewFullMap}
          onMapTouchStart={() => setScrollEnabled(false)}
          onMapTouchEnd={() => setScrollEnabled(true)}
        />

        <QuickActions
          onGuidelines={handleGuidelines}
          onShelterLocations={handleShelterLocations}
          onShareLocation={handleShareLocation}
          onEmergencyContact={handleEmergencyContact}
        />

        <Pressable onPress={() => router.push('/assistant' as Href)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16, marginBottom: 120, padding: 16, borderRadius: 20, backgroundColor: '#0F766E' }}>
          <MaterialCommunityIcons name="robot-happy-outline" size={30} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Ask DDAS AI</Text>
            <Text style={{ color: '#CCFBF1', fontSize: 12 }}>Is my dam safe? What should I do?</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#fff" />
        </Pressable>

        {/* <Text className="text-gray-600 text-base mt-6 px-4 mb-6">
          Welcome to the Dam Disaster Alert System. Monitor water levels and receive real-time alerts.
        </Text> */}
      </ScrollView>

      <GuidelinesModal
        visible={guidelinesVisible}
        guidelines={mockGuidelines}
        onClose={() => setGuidelinesVisible(false)}
        title={t('guidelines')}
      />

    </ScreenLayout>
  );
}
