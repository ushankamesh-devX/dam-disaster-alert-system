import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { Colors } from '@/constants/theme';
import { CTAButtonGreen } from '@/components/ui/cta-button';
import { useTranslation } from 'react-i18next';
import { hazardZoneService } from '@/services/hazard/hazard-zone.service';
import { damService } from '@/services/dams/dam.service';
import { LiveHazardMapView } from '@/components/pages/Hazardmap/LiveHazardMapView';

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

const DEFAULT_HAZARD_LEVELS: HazardLevel[] = [
  {
    level: '01',
    label: 'Hazard Level 01',
    description: 'Dam to 1km downstream',
    color: Colors.light.success, // Green
  },
  {
    level: '02',
    label: 'Hazard Level 02',
    description: 'Dam to 1km downstream',
    color: Colors.light.warning, // Orange/Yellow
  },
];

export function FloodRiskMap({
  title,
  hazardLevels = DEFAULT_HAZARD_LEVELS,
  onViewFullMap,
  onMapTouchStart,
  onMapTouchEnd,
}: FloodRiskMapProps) {
  const { t } = useTranslation();
  const [levels, setLevels] = useState<HazardLevel[]>(hazardLevels);
  // If title prop is provided, use it, otherwise use translation
  const displayTitle = title || t('flood_risk_map');

  useEffect(() => {
    setLevels(hazardLevels);
  }, [hazardLevels]);

  useEffect(() => {
    const fetchHazardZones = async () => {
      try {
        const damsRes = await damService.getActive();
        const dams: Record<string, unknown>[] = Array.isArray(damsRes.data)
          ? damsRes.data
          : (damsRes.data?.data ?? damsRes.data?.content ?? []);

        if (dams.length === 0) return;
        const damId = String(dams[0].id ?? dams[0].damId ?? '');
        if (!damId) return;

        const zonesRes = await hazardZoneService.getActiveByDam(damId);
        const rawZones: Record<string, unknown>[] = Array.isArray(zonesRes.data)
          ? zonesRes.data
          : (zonesRes.data?.data ?? []);

        if (rawZones.length > 0) {
          setLevels(rawZones.map((zone, i) => {
            const hazardLevel = (zone.hazardLevel ?? {}) as Record<string, unknown>;
            return {
              level: String(hazardLevel.levelNumber ?? hazardLevel.level ?? i + 1).padStart(2, '0'),
              label: String(zone.zoneName ?? hazardLevel.name ?? `Zone ${i + 1}`),
              description: String(zone.description ?? hazardLevel.description ?? ''),
              color: String(zone.fillColor ?? hazardLevel.color ?? Colors.light.warning),
            };
          }));
        }
      } catch {
        // keep current levels on error
      }
    };

    fetchHazardZones();
  }, []);

  return (
    <View className="mx- mt-6 mb-" style={{ paddingBottom: 20 }}>
      <View className="bg-white rounded-3xl overflow-hidden shadow-lg">
        {/* Title */}
        <Text className="text-gray-700 text-lg font-semibold px-4 pt-4 pb-2">
          {displayTitle}
        </Text>

        {/* Live Map Container */}
        <View
          className="mx-4 rounded-2xl overflow-hidden"
          style={{ height: 160 }}
          onTouchStart={onMapTouchStart}
          onTouchEnd={onMapTouchEnd}
          onTouchCancel={onMapTouchEnd}
        >
          <LiveHazardMapView mode="zones" />
        </View>

        {/* Interactive Map View Details Section */}
        <View className="px-4 pt-4 mb-10">
          <Text className="text-gray-600 text-sm font-medium mb-3">
            {t('interactive_map_details')}
          </Text>

          {/* Hazard Levels */}
          <View className="space-y-2 border p-3 rounded-lg border-gray-200">
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
      </View>

      {/* View Full Map Button */}
      <View className="px-16" style={{ transform: [{ translateY: -20 }] }}>
        <CTAButtonGreen title={t('view_full_map')} onPress={onViewFullMap} />
      </View>
    </View>
  );
}
