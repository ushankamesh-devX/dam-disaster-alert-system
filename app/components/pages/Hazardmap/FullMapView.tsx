import React, { useState, useEffect } from 'react';
import { View, Image, Dimensions } from 'react-native';
import { Colors } from '@/constants/theme';
import { HazardGauge } from './HazardGauge';
import { HazardLegend } from './HazardLegend';

interface FullMapViewProps {
  mapImageUri?: string;
}

interface HazardLevel {
  level: string;
  label: string;
  description: string;
  color: string;
}

const { width } = Dimensions.get('window');

// Mock data for hazard levels in the legend
const hazardLevels: HazardLevel[] = [
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

export function FullMapView({ 
  mapImageUri = 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?w=800&h=600&fit=crop' 
}: FullMapViewProps) {
  const [level, setLevel] = useState(75);
  const [hazardValue, setHazardValue] = useState(">1.2 m²s");

  useEffect(() => {
    // Simulate dynamic gauge changes
    const interval = setInterval(() => {
      const newLevel = Math.floor(Math.random() * 40) + 60; // Random between 60 and 100
      setLevel(newLevel);
      setHazardValue(`>${(newLevel / 60).toFixed(1)} m²s`);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <View className="flex-1 rounded-2xl overflow-hidden">
      <Image
        source={{ uri: mapImageUri }}
        className="w-full h-full"
        resizeMode="cover"
        style={{ backgroundColor: Colors.light.headerBackground }}
      />
      
      {/* Map Pin Overlay */}
      <View 
        className="absolute"
        style={{ 
          left: '35%', 
          top: '45%',
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: '#3B82F6',
          borderWidth: 4,
          borderColor: 'white',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
          elevation: 4,
        }}
      />
      
      {/* Hazard Gauge - Top Right Corner */}
      <View className="absolute top-4 right-4">
        <HazardGauge level={level} hazardValue={hazardValue} />
      </View>
      
      {/* Hazard Legend - Bottom Left Corner */}
      <View className="absolute bottom-4 left-4">
        <HazardLegend hazardLevels={hazardLevels} />
      </View>
    </View>
  );
}
