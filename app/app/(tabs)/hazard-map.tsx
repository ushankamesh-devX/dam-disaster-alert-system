import React, { useCallback, useEffect, useState } from 'react';
import { Linking, View, ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScreenLayout } from '@/components/ScreenLayout';
import { HazardBanner } from '@/components/pages/Hazardmap/HazardBanner';
import { FullMapView } from '@/components/pages/Hazardmap/FullMapView';
import { QuickActions } from '@/components/pages/Hazardmap/QuickActions';
import FakeCallScreen from '@/components/Emergency Contact/FakeCallScreen';
import { GuidelinesModal } from '@/components/pages/Guidelines/GuidelinesModal';
import { useTranslation } from 'react-i18next';
import { damService } from '@/services/dams/dam.service';
import { sensorService } from '@/services/sensors/sensor.service';
import { hazardZoneService } from '@/services/hazard/hazard-zone.service';
import { damStatusService } from '@/services/dams/dam-status.service';
import { Colors } from '@/constants/theme';
import { mockGuidelines } from '@/data/mock-guidelines';

const EMERGENCY_NUMBER = '117';

interface HazardLevelItem { level: string; label: string; description: string; color: string; }

const DEFAULT_LEVELS: HazardLevelItem[] = [
  { level: '01', label: 'Hazard Level 01', description: 'Dam to 1km downstream', color: Colors.light.success },
  { level: '02', label: 'Hazard Level 02', description: '1km – 5km downstream', color: Colors.light.warning },
  { level: '03', label: 'Hazard Level 03', description: '5km+ downstream', color: '#ef4444' },
];

export default function HazardMapScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [showFakeCall, setShowFakeCall] = useState(false);
  const [guidelinesVisible, setGuidelinesVisible] = useState(false);
  const [gaugeLevel, setGaugeLevel] = useState(75);
  const [hazardValue, setHazardValue] = useState('>1.2 m²s');
  const [hazardLevels, setHazardLevels] = useState<HazardLevelItem[]>(DEFAULT_LEVELS);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [showZones, setShowZones] = useState(true);
  const [showLocations, setShowLocations] = useState(true);

  const fetchLiveData = useCallback(async () => {
    try {
      // Fetch hazard zones for legend (first active dam)
      const damsRes = await damService.getActive();
      const dams: Record<string, unknown>[] = Array.isArray(damsRes.data)
        ? damsRes.data : (damsRes.data?.data ?? []);
      if (dams.length === 0) return;

      const damId = String(dams[0].id ?? dams[0].damId ?? '');
      if (!damId) return;

      const zonesRes = await hazardZoneService.getActiveByDam(damId);
      const rawZones: Record<string, unknown>[] = Array.isArray(zonesRes.data)
        ? zonesRes.data
        : (zonesRes.data?.data ?? []);

      if (rawZones.length > 0) {
        setHazardLevels(rawZones.map((zone, i) => {
          const hazardLevel = (zone.hazardLevel ?? {}) as Record<string, unknown>;
          return {
            level: String(hazardLevel.levelNumber ?? hazardLevel.level ?? i + 1).padStart(2, '0'),
            label: String(zone.zoneName ?? hazardLevel.name ?? `Zone ${i + 1}`),
            description: String(zone.description ?? hazardLevel.description ?? ''),
            color: String(zone.fillColor ?? hazardLevel.color ?? Colors.light.warning),
          };
        }));
      }

      // Fetch gauge data from latest sensor readings with dam status fallback
      const [readingsRes, statusRes] = await Promise.all([
        sensorService.getLatestReadingsByDam(damId).catch(() => ({ data: [] as Record<string, unknown>[] })),
        damStatusService.getByDam(damId).catch(() => ({ data: null })),
      ]);

      const readings: Record<string, unknown>[] = Array.isArray(readingsRes.data)
        ? readingsRes.data : (readingsRes.data?.data ?? readingsRes.data?.readings ?? []);

      let levelSet = false;

      if (readings.length > 0) {
        const waterReading = readings.find(
          (r) => String(r.sensorType ?? r.type ?? '').toLowerCase().includes('water')
        ) ?? readings[0];

        const currentValue = Number(waterReading.value ?? waterReading.reading ?? 0);
        const maxValue = Number(waterReading.maxValue ?? waterReading.capacity ?? 0);
        const newLevel = maxValue > 0 ? Math.min(100, Math.round((currentValue / maxValue) * 100)) : 0;
        if (newLevel > 0) {
          setGaugeLevel(newLevel);
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
            setGaugeLevel(computedLevel);
            const valueLabel = status.hazardValue
              ?? (status.waterLevelMeters != null ? `>${Number(status.waterLevelMeters).toFixed(1)} m` : undefined);
            if (valueLabel) setHazardValue(String(valueLabel));
          }
        }
      }
    } catch { /* keep defaults */ }
  }, []);

  useEffect(() => {
    fetchLiveData();
    const interval = setInterval(fetchLiveData, 30000);
    return () => clearInterval(interval);
  }, [fetchLiveData]);

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
    Linking.openURL(`tel:${EMERGENCY_NUMBER}`).catch(() => {});
  };

  const handleAnswerCall = () => {
    setShowFakeCall(false);
    Linking.openURL(`tel:${EMERGENCY_NUMBER}`).catch(() => {});
  };

  const handleDeclineCall = () => {
    setShowFakeCall(false);
  };

  const triggerTestCall = () => {
    setShowFakeCall(true);
  };

  return (
    <ScreenLayout
      title={t('hazard_map_title')}
      subtitle={t('hazard_map_subtitle')}
    >
      <ScrollView
        className="flex-1 rounded-2xl"
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
      >
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
          <FullMapView
            level={gaugeLevel}
            hazardValue={hazardValue}
            hazardLevels={hazardLevels}
            onMapTouchStart={() => setScrollEnabled(false)}
            onMapTouchEnd={() => setScrollEnabled(true)}
            showZones={showZones}
            showLocations={showLocations}
            onToggleZones={() => setShowZones((prev) => !prev)}
            onToggleLocations={() => setShowLocations((prev) => !prev)}
          />
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
        callerName={t('emergency_alert_system')}
        callerNumber="108"
        emergencyType={t('dam_emergency_alert')}
      />

      <GuidelinesModal
        visible={guidelinesVisible}
        guidelines={mockGuidelines}
        onClose={() => setGuidelinesVisible(false)}
        title={t('guidelines')}
      />

      {/* Test Trigger Button - Floating */}
      <TouchableOpacity
        style={styles.testButton}
        onPress={triggerTestCall}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="phone-alert" size={24} color="#fff" />
        <Text style={styles.testButtonText}>{t('test_call')}</Text>
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
