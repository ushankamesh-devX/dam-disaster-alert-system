import React, { useState, useEffect, useCallback } from 'react';
import { Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenLayout } from '@/components/ScreenLayout';
import { HazardCard } from '@/components/pages/Dashboard/HazardCard';
import { FloodRiskMap } from '@/components/pages/Dashboard/FloodRiskMap';
import { QuickActions } from '@/components/pages/Dashboard/QuickActions';
import { useTranslation } from 'react-i18next';
import { damService } from '@/services/dams/dam.service';
import { sensorService } from '@/services/sensors/sensor.service';

function computeLevel(waterLevel: number, capacity: number): number {
  if (!capacity || capacity === 0) return 0;
  return Math.min(100, Math.round((waterLevel / capacity) * 100));
}

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [level, setLevel] = useState(75);
  const [hazardValue, setHazardValue] = useState(">1.2 m²s");

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

      const readingsRes = await sensorService.getLatestReadingsByDam(damId);
      const readings: Record<string, unknown>[] = Array.isArray(readingsRes.data)
        ? readingsRes.data
        : (readingsRes.data?.data ?? readingsRes.data?.readings ?? []);

      if (readings.length > 0) {
        const waterReading = readings.find(
          (r) => String(r.sensorType ?? r.type ?? '').toLowerCase().includes('water')
        ) ?? readings[0];

        const currentValue = Number(waterReading.value ?? waterReading.reading ?? 0);
        const maxValue = Number(waterReading.maxValue ?? waterReading.capacity ?? 100);
        const newLevel = computeLevel(currentValue, maxValue);

        setLevel(newLevel);
        setHazardValue(`>${currentValue.toFixed(1)} m`);
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
