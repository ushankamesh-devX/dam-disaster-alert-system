import React, { useState, useEffect, useCallback } from 'react';
import { Linking, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenLayout } from '@/components/ScreenLayout';
import { HazardCard } from '@/components/pages/Dashboard/HazardCard';
import { FloodRiskMap } from '@/components/pages/Dashboard/FloodRiskMap';
import { QuickActions } from '@/components/pages/Dashboard/QuickActions';
import { GuidelinesModal } from '@/components/pages/Guidelines/GuidelinesModal';
import { useTranslation } from 'react-i18next';
import { damService } from '@/services/dams/dam.service';
import { sensorService } from '@/services/sensors/sensor.service';
import { mockGuidelines } from '@/data/mock-guidelines';
import { damStatusService } from '@/services/dams/dam-status.service';

function computeLevel(waterLevel: number, capacity: number): number {
  if (!capacity || capacity === 0) return 0;
  return Math.min(100, Math.round((waterLevel / capacity) * 100));
}

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [level, setLevel] = useState(75);
  const [hazardValue, setHazardValue] = useState(">1.2 m²s");
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [guidelinesVisible, setGuidelinesVisible] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      const damsRes = await damService.getActive();
      const dams: Record<string, unknown>[] = Array.isArray(damsRes.data)
        ? damsRes.data
        : (damsRes.data?.data ?? damsRes.data?.content ?? []);

      if (dams.length === 0) return;

      const firstDam = dams[0];
      const damId = String(firstDam.id ?? firstDam.damId ?? '');
      if (!damId) return;

      const [readingsRes, statusRes] = await Promise.all([
        sensorService.getLatestReadingsByDam(damId).catch(() => ({ data: [] as Record<string, unknown>[] })),
        damStatusService.getByDam(damId).catch(() => ({ data: null })),
      ]);

      const readings: Record<string, unknown>[] = Array.isArray(readingsRes.data)
        ? readingsRes.data
        : (readingsRes.data?.data ?? readingsRes.data?.readings ?? []);

      let levelSet = false;

      if (readings.length > 0) {
        const waterReading = readings.find(
          (r) => String(r.sensorType ?? r.type ?? '').toLowerCase().includes('water')
        ) ?? readings[0];

        const currentValue = Number(waterReading.value ?? waterReading.reading ?? 0);
        const maxValue = Number(waterReading.maxValue ?? waterReading.capacity ?? 0);
        const newLevel = maxValue > 0 ? computeLevel(currentValue, maxValue) : 0;

        if (newLevel > 0) {
          setLevel(newLevel);
          setHazardValue(`>${currentValue.toFixed(1)} m`);
          levelSet = true;
        }
      }

      if (!levelSet) {
        const status = statusRes.data?.data ?? statusRes.data;
        if (status) {
          const percentage = Number(
            status.waterLevelPercentage ??
            status.storagePercentage ??
            status.floodRiskScore ??
            0
          );

          const computedLevel = percentage > 0
            ? Math.min(100, Math.round(percentage))
            : 0;

          if (computedLevel > 0) {
            setLevel(computedLevel);
            const valueLabel = status.hazardValue
              ?? (status.waterLevelMeters != null ? `>${Number(status.waterLevelMeters).toFixed(1)} m` : undefined);
            if (valueLabel) setHazardValue(String(valueLabel));
          }
        }
      }
    } catch {
      // keep current values on error
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const handleViewFullMap = () => {
    router.push('/hazard-map');
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
      >
        <HazardCard level={level} hazardValue={hazardValue} />

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
