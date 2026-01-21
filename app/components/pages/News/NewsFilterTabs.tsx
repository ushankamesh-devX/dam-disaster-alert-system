// components/pages/News/NewsFilterTabs.tsx
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';

interface NewsFilterTabsProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

const filters = [
  { id: 'all', label: 'All' },
  { id: 'dam-status', label: 'Dam Status' },
  { id: 'weather-alerts', label: 'Weather Alerts' },
  { id: 'emergency', label: 'Emergency' },
];

export const NewsFilterTabs: React.FC<NewsFilterTabsProps> = ({
  activeFilter,
  onFilterChange,
}) => {
  return (
    <View className="mb-4" style={{ height: 36 }}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        style={{ height: 36 }}
      >
        <View className="flex-row gap-2" style={{ height: 36 }}>
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.id}
              onPress={() => onFilterChange(filter.id)}
              style={{ height: 36 }}
              className={`px-4 rounded-full justify-center ${
                activeFilter === filter.id
                  ? 'bg-blue-600'
                  : 'bg-gray-100 border border-gray-200'
              }`}
              activeOpacity={0.7}
            >
              <Text
                className={`text-sm font-medium ${
                  activeFilter === filter.id ? 'text-white' : 'text-gray-600'
                }`}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};