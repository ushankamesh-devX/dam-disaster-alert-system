import React from 'react';
import { View, Text, TouchableOpacity, StatusBar } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface ScreenLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function ScreenLayout({ title, subtitle, children }: ScreenLayoutProps) {
  return (
    <View className="flex-1 bg-[#455A64]">
      <StatusBar barStyle="light-content" />
      {/* Header Area */}
      <View className="bg-[#455A64] pt-12 pb-2 px-4 shadow-md z-10">
        {/* Settings Icon Row */}
        <View className="flex-row justify-end items-center mb-">
          <TouchableOpacity>
            <MaterialCommunityIcons name="cog-outline" size={28} color="white" />
          </TouchableOpacity>
        </View>
        
        {/* Centered Title and Subtitle */}
        <View className="items-center justify-center pb-4">
             <Text className="text-white text-3xl font-bold tracking-wider">{title}</Text>
             {subtitle && (
               <Text className="text-gray-300 text- mt-2 text-center font-light">
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
