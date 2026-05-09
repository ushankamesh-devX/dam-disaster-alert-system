import React from 'react';
import { View, Text } from 'react-native';
import { Colors } from '@/constants/theme';

interface HazardLevel {
  level: string;
  label: string;
  description: string;
  color: string;
}

interface HazardLegendProps {
  hazardLevels?: HazardLevel[];
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
  {
    level: '03',
    label: 'Hazard Level 03',
    description: '1km to 5km downstream',
    color: '#FFA500', // Orange
  },
  {
    level: '04',
    label: 'Hazard Level 04',
    description: '5km to 10km downstream',
    color: '#FF6347', // Red-ish
  },
];

export function HazardLegend({ hazardLevels = mockHazardLevels }: HazardLegendProps) {
  return (
    <View className="bg-white rounded-2xl shadow-lg" style={{ paddingVertical: 12, paddingHorizontal: 16, minWidth: 220 }}>
      {hazardLevels.map((hazard, index) => (
        <View key={index} className="flex-row items-start" style={{ marginBottom: index < hazardLevels.length - 1 ? 8 : 0 }}>
          {/* Color Indicator - Square */}
          <View
            style={{
              width: 20,
              height: 20,
              backgroundColor: hazard.color,
              marginRight: 10,
              marginTop: 1,
            }}
          />
          {/* Text Content */}
          <View style={{ flex: 1 }}>
            <Text className="text-gray-800 font-bold" style={{ fontSize: 14, marginBottom: 1 }}>
              {hazard.label}
            </Text>
            <Text className="text-gray-600" style={{ fontSize: 12 }}>
              {hazard.description}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}
