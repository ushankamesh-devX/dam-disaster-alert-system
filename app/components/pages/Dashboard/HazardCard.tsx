import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withRepeat, 
  withSequence,
  Easing
} from 'react-native-reanimated';

interface HazardCardProps {
  level: number; // 0 to 100 representing the gauge percentage
  hazardValue: string;
}

export function HazardCard({ level = 75, hazardValue = ">1.2 m²s" }: HazardCardProps) {
  const rotation = useSharedValue(-90); // Start at left (-90deg)

  useEffect(() => {
    // Map level (0-100) to degrees (-90 to 90)
    const targetRotation = -90 + (level / 100) * 180;
    rotation.value = withTiming(targetRotation, { duration: 1000, easing: Easing.out(Easing.exp) });
  }, [level]);

  const animatedNeedleStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { rotate: `${rotation.value}deg` },
      ],
    };
  });

  return (
    <View className="bg-[#5D2E2E] rounded-3xl mx-4 mt-6 overflow-hidden shadow-lg border border-[#7D3E3E]">
      {/* Header Section */}
      <View className="flex-row items-center p-4 pb-3">
        <View className="mr-3">
             <MaterialCommunityIcons name="bullhorn-outline" size={32} color="white" style={{ transform: [{ rotate: '-15deg' }] }} />
        </View>
        <View>
          <Text className="text-white text-xl font-bold tracking-wide">SEVERE FLOOD HAZARD</Text>
          <Text className="text-gray-200 text-sm">Immediate Evacuation Recommended</Text>
        </View>
      </View>

      {/* Divider */}
      <View className="h-[1px] bg-[#8B4513] mx-4 opacity-50" />

      {/* Body Section */}
      <View className="flex-row items-center justify-between p-4 pt-6 pb-8">
        {/* Left Icon */}
        <View className="w-1/4 items-center">
            <MaterialCommunityIcons name="alert-outline" size={32} color="white" />
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
            <Text className="text-white text-xs font-medium">Hazard Level:</Text>
            <Text className="text-[#9ACD32] text-lg font-bold">{hazardValue}</Text>
        </View>
      </View>
    </View>
  );
}
