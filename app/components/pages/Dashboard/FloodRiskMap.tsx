import React from 'react';
import { View, Text, Image } from 'react-native';
import { Colors } from '@/constants/theme';
import { CTAButtonGreen } from '@/components/ui/cta-button';
import { useTranslation } from 'react-i18next';

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
}

// Mock data for hazard levels
const mockHazardLevels: HazardLevel[] = [
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
  hazardLevels = mockHazardLevels,
  onViewFullMap,
}: FloodRiskMapProps) {
  const { t } = useTranslation();
  // If title prop is provided, use it, otherwise use translation
  const displayTitle = title || t('flood_risk_map');

  return (
    <View className="mx- mt-6 mb-" style={{ paddingBottom: 20 }}>
      <View className="bg-white rounded-3xl overflow-hidden shadow-lg">
        {/* Title */}
        <Text className="text-gray-700 text-lg font-semibold px-4 pt-4 pb-2">
          {displayTitle}
        </Text>

        {/* Map Image Container */}
        <View className="mx-4 rounded-2xl overflow-hidden">
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?w=400&h=200&fit=crop' }}
            className="w-full h-40"
            resizeMode="cover"
            style={{ backgroundColor: Colors.light.headerBackground }}
          />
          {/* Map Pin Overlay */}
          <View
            className="absolute"
            style={{
              left: '35%',
              top: '55%',
              width: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: '#3B82F6',
              borderWidth: 3,
              borderColor: 'white',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 4,
            }}
          />
        </View>

        {/* Interactive Map View Details Section */}
        <View className="px-4 pt-4 mb-10">
          <Text className="text-gray-600 text-sm font-medium mb-3">
            {t('interactive_map_details')}
          </Text>

          {/* Hazard Levels */}
          <View className="space-y-2 border p-3 rounded-lg border-gray-200">
            {hazardLevels.map((hazard, index) => (
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
