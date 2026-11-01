import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing
} from 'react-native-reanimated';

interface HazardCardProps {
  level: number | null; // Water-level percentage; null means no measurement.
  hazardValue: string;
  title?: string;
  subtitle?: string;
  status?: string;
  statusLabel?: string;
  children?: React.ReactNode;
}

export function HazardCard({ level = null, hazardValue = 'Unavailable', title = 'Flood hazard', subtitle = 'Latest recorded status', status = 'unavailable', statusLabel = 'Unavailable', children }: HazardCardProps) {
  const elevated = ['high', 'severe', 'critical', 'emergency'].includes(status);
  const rotation = useSharedValue(-90); // Start at left (-90deg)

  useEffect(() => {
    // Map level (0-100) to degrees (-90 to 90)
    const targetRotation = -90 + (Math.max(0, Math.min(100, level ?? 0)) / 100) * 180;
    rotation.value = withTiming(targetRotation, { duration: 1000, easing: Easing.out(Easing.exp) });
  }, [level, rotation]);

  const animatedNeedleStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { rotate: `${rotation.value}deg` },
      ],
    };
  });

  return (
    <View style={{ backgroundColor: ['high', 'severe', 'critical', 'emergency'].includes(status) ? '#5D2E2E' : '#455A64', borderColor: ['high', 'severe', 'critical', 'emergency'].includes(status) ? '#7D3E3E' : '#627780' }} className="rounded-3xl overflow-hidden shadow-lg border">
      {/* Header Section */}
      <View className="flex-row items-center p-4 pb-3">
        <View className="mr-3">
          <MaterialCommunityIcons name="bullhorn-outline" size={32} color="white" style={{ transform: [{ rotate: '-15deg' }] }} />
        </View>
        <View className="flex-1">
          <Text className="text-white text-xl font-bold tracking-wide">{title}</Text>
          <Text className="text-gray-200 text-sm">{subtitle}</Text>
        </View>
        <View style={{ backgroundColor: 'rgba(255,255,255,0.16)' }} className="rounded-full px-3 py-2 ml-2">
          <Text className="text-white text-xs font-bold">{statusLabel}</Text>
        </View>
      </View>

      {/* Divider */}
      <View className="h-[1px] bg-[#8B4513] mx-4 opacity-50" />

      {/* Body Section */}
      <View className="flex-row items-center justify-between p-4 pt-6 pb-8">
        {/* Left Icon */}
        <View className="w-1/4 items-center">
          <MaterialCommunityIcons name={elevated ? 'alert-outline' : status === 'safe' ? 'shield-check-outline' : status === 'unavailable' ? 'help-circle-outline' : 'information-outline'} size={32} color="white" />
        </View>

        {/* Center Gauge */}
        <View className="w-2/4 items-center justify-center ">
          <View className="w-32 h-16 overflow-hidden relative items-center">
            {/* Gauge Background - Full Circle Rotated */}
            {/* 
                   border-t: Brown (Rotates to Left side 9-12)
                   border-r: Green (Rotates to Right side 12-3)
                   border-b: Transparent
                   border-l: Transparent
                   Rotation: -45deg
                */}
            <View className="w-32 h-32 rounded-full absolute top-0 border-[18px] border-t-[#A0522D] border-r-[#9ACD32] border-b-transparent border-l-transparent"
              style={{ transform: [{ rotate: '-45deg' }] }}
            />
          </View>

          {/* Needle Container - Absolute over the gauge */}
          <View className="absolute top-0 w-32 h-32 items-center justify-center pointer-events-none" style={{ marginTop: 0 }}>
            {/* Rotating Wrapper */}
            <Animated.View style={[
              {
                width: 160, // Match container width
                height: 160, // Match container height
                alignItems: 'center',
                justifyContent: 'center', // Center pivot
                position: 'absolute',
                opacity: level == null ? 0 : 1,
              },
              animatedNeedleStyle
            ]}>
              {/* Tapered Needle (Triangle) */}
              {/* 
                         We want the needle to point UP from the center.
                         So we position it 'absolute' with bottom at 50%?
                         Actually, inside a centered container, we can just use margins or absolute positioning relative to center.
                      */}
              <View style={{
                width: 0,
                height: 0,
                backgroundColor: 'transparent',
                borderStyle: 'solid',
                borderLeftWidth: 4,
                borderRightWidth: 4,
                borderBottomWidth: 40, // Length of needle
                borderLeftColor: 'transparent',
                borderRightColor: 'transparent',
                borderBottomColor: '#E67E22',
                position: 'absolute',
                bottom: '50%', // Base starts at center
                marginBottom: -4, // Overlap pivot slightly
              }} />
            </Animated.View>

            {/* Pivot Point - Centered */}
            <View className="w-5 h-5 bg-[#E67E22] rounded-full absolute" />
          </View>
        </View>

        {/* Right Text */}
        <View className="w-1/4 pl-2">
          <Text className="text-white text-xs font-medium">Water level</Text>
          <Text className="text-[#9ACD32] text-lg font-bold">{hazardValue}</Text>
        </View>
      </View>
      {children}
    </View>
  );
}
