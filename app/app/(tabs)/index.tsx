import React, { useState } from 'react';
import { Linking, RefreshControl, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
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
