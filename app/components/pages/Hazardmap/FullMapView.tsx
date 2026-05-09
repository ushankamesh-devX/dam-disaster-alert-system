import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { HazardGauge } from './HazardGauge';
import { HazardLegend } from './HazardLegend';
import { LiveHazardMapView } from './LiveHazardMapView';
import { Colors } from '@/constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface HazardLevel {
  level: string;
  label: string;
  description: string;
  color: string;
}

interface FullMapViewProps {
  level?: number;
  hazardValue?: string;
  hazardLevels?: HazardLevel[];
  onMapTouchStart?: () => void;
  onMapTouchEnd?: () => void;
  showZones?: boolean;
  showLocations?: boolean;
  showDams?: boolean;
  onToggleZones?: () => void;
  onToggleLocations?: () => void;
}

const DEFAULT_HAZARD_LEVELS: HazardLevel[] = [
  { level: '01', label: 'Hazard Level 01', description: 'Dam to 1km downstream', color: Colors.light.success },
  { level: '02', label: 'Hazard Level 02', description: '1km – 5km downstream', color: Colors.light.warning },
  { level: '03', label: 'Hazard Level 03', description: '5km+ downstream', color: '#ef4444' },
];

export function FullMapView({
  level = 75,
  hazardValue = '>1.2 m²s',
  hazardLevels = DEFAULT_HAZARD_LEVELS,
  onMapTouchStart,
  onMapTouchEnd,
  showZones = true,
  showLocations = true,
  showDams = true,
  onToggleZones,
  onToggleLocations,
}: FullMapViewProps) {
  return (
    <View className="flex-1 rounded-2xl overflow-hidden">
      {/* Live Leaflet map — fills the entire view */}
      <View
        className="flex-1"
        onTouchStart={onMapTouchStart}
        onTouchEnd={onMapTouchEnd}
        onTouchCancel={onMapTouchEnd}
      >
        <LiveHazardMapView
          showZones={showZones}
          showLocations={showLocations}
          showDams={showDams}
        />
      </View>

      {/* HazardGauge overlay — top-right corner */}
      <View className="absolute top-4 right-4" pointerEvents="none">
        <HazardGauge level={level} hazardValue={hazardValue} />
      </View>

      {/* HazardLegend overlay — bottom-left corner */}
      <View className="absolute bottom-4 left-4" pointerEvents="auto">
        <HazardLegend hazardLevels={hazardLevels} maxHeight={180} />
      </View>

      {/* Layer toggles */}
      <View className="absolute top-4 left-4" pointerEvents="auto">
        <View className="bg-white/95 rounded-xl px-3 py-2 shadow-lg">
          <TouchableOpacity
            className="flex-row items-center py-1"
            onPress={onToggleZones}
            accessibilityRole="button"
            accessibilityLabel="Toggle hazard zones"
          >
            <MaterialCommunityIcons
              name={showZones ? 'checkbox-marked' : 'checkbox-blank-outline'}
              size={18}
              color={showZones ? '#2563eb' : '#9ca3af'}
            />
            <Text className="text-gray-800 ml-2 text-xs">Zones</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-row items-center py-1"
            onPress={onToggleLocations}
            accessibilityRole="button"
            accessibilityLabel="Toggle safe locations"
          >
            <MaterialCommunityIcons
              name={showLocations ? 'checkbox-marked' : 'checkbox-blank-outline'}
              size={18}
              color={showLocations ? '#2563eb' : '#9ca3af'}
            />
            <Text className="text-gray-800 ml-2 text-xs">Locations</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
