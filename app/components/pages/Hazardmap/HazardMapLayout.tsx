import React from 'react';
import { View, Text, TouchableOpacity, StatusBar } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface HazardMapLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function HazardMapLayout({ title, subtitle, children }: HazardMapLayoutProps) {
  const router = useRouter();

  return (
    <View className="flex-1 bg-[#455A64]">
      <StatusBar barStyle="light-content" />
      {/* Header Area */}
      <View className="bg-[#455A64] pt-12 pb-2 px-4 shadow-md z-10">
        {/* Back Button and Settings Row */}
        <View className="flex-row justify-between items-center mb-2">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="flex-row items-center"
          >
            <MaterialCommunityIcons name="chevron-left" size={28} color="white" />
            <Text className="text-white text-base ml-1">Back</Text>
          </TouchableOpacity>
          
          <TouchableOpacity>
            <MaterialCommunityIcons name="cog-outline" size={28} color="white" />
          </TouchableOpacity>
        </View>
        
        {/* Centered Title and Subtitle */}
        <View className="items-center justify-center pb-4">
          <Text className="text-white text-3xl font-bold tracking-wider">{title}</Text>
          {subtitle && (
            <Text className="text-gray-300 text-sm mt-2 text-center font-light">
              {subtitle}
            </Text>
          )}
        </View>
      </View>

      {/* Content Area */}
      <Animated.View 
        entering={FadeInDown.delay(100).duration(500).springify()}
        className="flex-1 bg-white rounded-t-[30px] px-4 pt-6"
      >
        {children}
      </Animated.View>
    </View>
  );
}
