import React from 'react';
import { View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface HazardBannerProps {
  title?: string;
  subtitle?: string;
}

export function HazardBanner({ 
  title = 'SEVERE FLOOD HAZARD',
  subtitle = 'Immediate Evacuation Recommended'
}: HazardBannerProps) {
  return (
    <View 
      className="flex-row items-center px-5 py-4 rounded-2xl"
      style={{ 
        backgroundColor: '#6B2D2D',
        borderWidth: 2,
        borderColor: '#8B4545',
      }}
    >
      {/* Megaphone Icon */}
      <View className="mr-4">
        <MaterialCommunityIcons 
          name="bullhorn-outline" 
          size={32} 
          color="white" 
          style={{ transform: [{ rotate: '-15deg' }] }} 
        />
      </View>
      
      {/* Text Content */}
      <View className="flex-1">
        <Text className="text-white text-lg font-bold tracking-wide">
          {title}
        </Text>
        <Text className="text-gray-200 text-sm">
          {subtitle}
        </Text>
      </View>
    </View>
  );
}
