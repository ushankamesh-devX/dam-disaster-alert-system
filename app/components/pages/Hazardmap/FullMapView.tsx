import React from 'react';
import { View } from 'react-native';
import { HazardGauge } from './HazardGauge';
import { HazardLegend } from './HazardLegend';
import { LiveHazardMapView } from './LiveHazardMapView';
import { Colors } from '@/constants/theme';

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
}: FullMapViewProps) {
  return (
    <View className="flex-1 rounded-2xl overflow-hidden">
      {/* Live Leaflet map — fills the entire view */}
      <LiveHazardMapView />

      {/* HazardGauge overlay — top-right corner */}
      <View className="absolute top-4 right-4" pointerEvents="none">
        <HazardGauge level={level} hazardValue={hazardValue} />
      </View>

      {/* HazardLegend overlay — bottom-left corner */}
      <View className="absolute bottom-4 left-4" pointerEvents="none">
        <HazardLegend hazardLevels={hazardLevels} />
      </View>
    </View>
  );
}
