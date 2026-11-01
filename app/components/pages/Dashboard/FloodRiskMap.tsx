import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { Colors } from '@/constants/theme';
import { CTAButtonGreen } from '@/components/ui/cta-button';
import { useTranslation } from 'react-i18next';
import { hazardZoneService } from '@/services/hazard/hazard-zone.service';
import { damService } from '@/services/dams/dam.service';
import { LiveHazardMapView } from '@/components/pages/Hazardmap/LiveHazardMapView';
import { pickDisplayedDam } from '@/services/dams/display-dam';
import { useAuth } from '@/contexts/AuthContext';

interface HazardLevel {
  level: string;
  label: string;
  description: string;
  color: string;
}

interface FloodRiskMapProps {
  title?: string;
  hazardLevels?: HazardLevel[];
  onViewFullMap?: () => void;
  onMapTouchStart?: () => void;
  onMapTouchEnd?: () => void;
}

export function FloodRiskMap({
  title,
  hazardLevels = [],
  onViewFullMap,
  onMapTouchStart,
  onMapTouchEnd,
}: FloodRiskMapProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [apiLevels, setLevels] = useState<HazardLevel[] | null>(null);
  const levels = apiLevels ?? hazardLevels;
  const [previewDamId, setPreviewDamId] = useState<string>();
  const [zoneState, setZoneState] = useState('loading');
  // If title prop is provided, use it, otherwise use translation
  const displayTitle = title || t('flood_risk_map');

  useEffect(() => {
    let cancelled = false;
    const fetchHazardZones = async () => {
      try {
        const damsRes = await damService.getActive();
        const dams: Record<string, unknown>[] = Array.isArray(damsRes.data)
          ? damsRes.data
          : (damsRes.data?.data ?? damsRes.data?.content ?? []);

        if (dams.length === 0) throw new Error('Dam unavailable');
        const selectedDam = pickDisplayedDam(dams, user?.preferredDamId);
        if (!selectedDam) throw new Error('Dam unavailable');
        const damId = String(selectedDam.id ?? selectedDam.damId ?? '');
        if (!damId) throw new Error('Dam unavailable');
        if (!cancelled) setPreviewDamId(damId);

        const zonesRes = await hazardZoneService.getActiveByDam(damId);
        const rawZones: Record<string, unknown>[] = Array.isArray(zonesRes.data)
          ? zonesRes.data
          : (zonesRes.data?.data ?? []);

        if (!cancelled) setZoneState(rawZones.length ? 'ready' : 'empty');
        if (!cancelled && rawZones.length > 0) {
          setLevels(rawZones.map((zone, i) => {
            const hazardLevel = (zone.hazardLevel ?? {}) as Record<string, unknown>;
            return {
              level: String(hazardLevel.levelNumber ?? hazardLevel.level ?? i + 1).padStart(2, '0'),
              label: String(zone.zoneName ?? hazardLevel.name ?? `Zone ${i + 1}`),
              description: String(zone.description ?? hazardLevel.description ?? ''),
              color: String(zone.fillColor ?? hazardLevel.color ?? Colors.light.warning),
            };
          }).sort((a, b) => Number(a.level) - Number(b.level)));
        }
      } catch {
        if (!cancelled) setZoneState('failed');
      }
    };

    fetchHazardZones();
    return () => { cancelled = true; };
  }, [user?.preferredDamId]);

  return (
    <View style={{ marginTop: 24, marginBottom: 16 }}>
      <View className="bg-white rounded-3xl overflow-hidden shadow-lg">
        {/* Title */}
        <Text className="text-gray-700 text-lg font-semibold px-4 pt-4 pb-2">
          {displayTitle}
        </Text>

        {/* Live Map Container */}
        <View
          className="mx-4 rounded-2xl overflow-hidden"
          style={{ height: 220 }}
          onTouchStart={onMapTouchStart}
          onTouchEnd={onMapTouchEnd}
          onTouchCancel={onMapTouchEnd}
        >
          <LiveHazardMapView mode="zones" focusDamId={previewDamId ?? String(user?.preferredDamId ?? '')} />
        </View>

        {/* Interactive Map View Details Section */}
        <View className="px-4 pt-4 pb-4">
          <Text className="text-gray-600 text-sm font-medium mb-3">
            {t('interactive_map_details')}
          </Text>

          {/* Hazard Levels */}
          <View className="space-y-2 border p-3 rounded-lg border-gray-200">
            {zoneState !== 'ready' && <Text className="text-gray-600 text-sm">{zoneState === 'loading' ? 'Loading hazard zones…' : zoneState === 'failed' ? 'Hazard zones unavailable. Open the full map to try again.' : 'No hazard zones are published for this dam.'}</Text>}
            {levels.map((hazard, index) => (
              <View key={index} className="flex-row items-start mb-2">
                {/* Color Indicator */}
                <View
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    backgroundColor: hazard.color,
                    marginRight: 12,
                    marginTop: 2,
                  }}
                />
                {/* Text Content */}
                <View className="flex-1">
                  <Text className="text-gray-800 text-sm font-semibold">
                    {hazard.label}
                  </Text>
                  <Text className="text-gray-500 text-xs">
                    {hazard.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          <CTAButtonGreen title={t('view_full_map')} onPress={onViewFullMap} />
        </View>
      </View>
    </View>
  );
}
