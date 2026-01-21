import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AlertCard } from '@/components/AlertCard';
import Animated, { FadeInDown } from 'react-native-reanimated';
// project page begin
/**
 * AlertsScreen Component
 * The central hub for displaying real-time disaster alerts and critical warnings.
 * 
 * Features:
 * - Real-time alert feed
 * - Sticky header with navigation controls
 * - Animated content entry
 * - Dark-themed primary UI with a clean card-based list
 */
export default function AlertsScreen() {
  const alerts = [
    {
      id: '1',
      title: 'CRITICAL WARNING',
      description: 'Water level is nearing to a high threshold. Prepare for evacuation.',
      location: 'Mullaperiyar',
      timestamp: '5 minutes ago',
    },
    {
      id: '2',
      title: 'CRITICAL WARNING',
      description: 'Water level is nearing to a high threshold. Prepare for evacuation.',
      location: 'Mullaperiyar',
      timestamp: '5 minutes ago',
    },
    {
      id: '3',
      title: 'CRITICAL WARNING',
      description: 'Water level is nearing to a high threshold. Prepare for evacuation.',
      location: 'Mullaperiyar',
      timestamp: '5 minutes ago',
    },
    {
      id: '4',
      title: 'CRITICAL WARNING',
      description: 'Water level is nearing to a high threshold. Prepare for evacuation.',
      location: 'Mullaperiyar',
      timestamp: '5 minutes ago',
      imageUrl: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=800&q=80',
    },
    {
      id: '5',
      title: 'CRITICAL WARNING',
      description: 'Water level is nearing to a high threshold. Prepare for evacuation.',
      location: 'Mullaperiyar',
      timestamp: '5 minutes ago',
    },
  ];

  return (
    <View className="flex-1 bg-[#455A64]">
      <StatusBar barStyle="light-content" />

      {/* Header Area */}
      <View className="bg-[#455A64] pt-12 pb-2 px-4 shadow-md z-10">
        {/* Back Button and Settings */}
        <View className="flex-row justify-between items-center mb-4">
          <TouchableOpacity>
            <MaterialCommunityIcons name="arrow-left" size={28} color="white" />
          </TouchableOpacity>
          <TouchableOpacity>
            <MaterialCommunityIcons name="cog-outline" size={28} color="white" />
          </TouchableOpacity>
        </View>

        {/* Centered Title and Subtitle */}
        <View className="items-center justify-center pb-4">
          <Text className="text-white text-3xl font-bold tracking-wider">Alert & Updates</Text>
          <Text className="text-gray-300 text-sm mt-2 text-center font-light">
            Stay informed with our updates this chat
          </Text>
        </View>
      </View>

      {/* Content Area */}
      <Animated.View
        entering={FadeInDown.delay(100).duration(500).springify()}
        className="flex-1 bg-white rounded-t-[30px] px-4 pt-6"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          {alerts.map((alert) => (
            <AlertCard
              key={alert.id}
              title={alert.title}
              description={alert.description}
              location={alert.location}
              timestamp={alert.timestamp}
              imageUrl={alert.imageUrl}
            />
          ))}
        </ScrollView>
      </Animated.View>
    </View>
  );
}
