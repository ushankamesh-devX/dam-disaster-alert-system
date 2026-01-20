import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  Easing
} from 'react-native-reanimated';

interface HazardGaugeProps {
  level: number; // 0 to 100 representing the gauge percentage
  hazardValue: string;
}

export function HazardGauge({ level = 75, hazardValue = ">1.2 m²s" }: HazardGaugeProps) {
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
    <View className="bg-white/95 rounded-2xl p-3 shadow-lg" style={{ width: 110 }}>
      {/* Header */}
      <Text className="text-gray-700 text-xs font-semibold text-center mb-1">
        Hazard Level:
      </Text>

      {/* Gauge Container */}
      <View className="items-center justify-center">
        <View className="w-24 h-12 overflow-hidden relative items-center">
          {/* Gauge Background - Full Circle Rotated */}
          <View 
            className="w-24 h-24 rounded-full absolute top-0 border-[12px]" 
            style={{ 
              borderTopColor: '#A0522D', // Brown/Red for high risk
              borderRightColor: '#9ACD32', // Green for safe
              borderBottomColor: 'transparent',
              borderLeftColor: 'transparent',
              transform: [{ rotate: '-45deg' }] 
            }}
          />
        </View>

        {/* Needle Container - Absolute over the gauge */}
        <View className="absolute top-0 w-24 h-24 items-center justify-center pointer-events-none" style={{ marginTop: 0 }}> 
          {/* Rotating Wrapper */}
          <Animated.View style={[
            {
              width: 96,
              height: 96,
              alignItems: 'center',
              justifyContent: 'center',
              position: 'absolute',
            }, 
            animatedNeedleStyle
          ]}>
            {/* Tapered Needle (Triangle) */}
            <View style={{
              width: 0,
              height: 0,
              backgroundColor: 'transparent',
              borderStyle: 'solid',
              borderLeftWidth: 3,
              borderRightWidth: 3,
              borderBottomWidth: 28,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: '#E67E22',
              position: 'absolute',
              bottom: '50%',
              marginBottom: -3,
            }} />
          </Animated.View>

          {/* Pivot Point - Centered */}
          <View className="w-4 h-4 bg-[#E67E22] rounded-full absolute" />
        </View>
      </View>

      {/* Value Display */}
      <Text className="text-[#E67E22] text-lg font-bold text-center mt-1">
        {hazardValue}
      </Text>
    </View>
  );
}
