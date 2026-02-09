// components/pages/News/NewsFilterTabs.tsx
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';

interface NewsFilterTabsProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

export const NewsFilterTabs: React.FC<NewsFilterTabsProps> = ({
  activeFilter,
  onFilterChange,
}) => {
  const { t } = useTranslation();

  const filters = [
    { id: 'all', label: t('filter_all') },
    { id: 'dam-status', label: t('filter_dam') },
    { id: 'weather-alerts', label: t('filter_weather') },
    { id: 'emergency', label: t('filter_emergency') },
  ];
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
              className={`px-4 rounded-full justify-center ${activeFilter === filter.id
                  ? 'bg-blue-600'
                  : 'bg-gray-100 border border-gray-200'
                }`}
              activeOpacity={0.7}
            >
              <Text
                className={`text-sm font-medium ${activeFilter === filter.id ? 'text-white' : 'text-gray-600'
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