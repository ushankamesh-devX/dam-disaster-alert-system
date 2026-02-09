import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CTAButtonOrange, CTAButtonYellow } from '@/components/ui/cta-button';
import { useTranslation } from 'react-i18next';

interface QuickActionsProps {
  onGuidelines?: () => void;
  onShelterLocations?: () => void;
  onShareLocation?: () => void;
  onEmergencyContact?: () => void;
}

export function QuickActions({
  onGuidelines,
  onShelterLocations,
  onShareLocation,
  onEmergencyContact,
}: QuickActionsProps) {
  const { t } = useTranslation();

  return (
    <View className="mx- -mt-6 mb-8">
      {/* Header with small action buttons */}
      <View className="bg-white rounded-2xl p-4 shadow-sm mb-3">
        {/* Small Action Buttons Row */}
        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={onGuidelines}
            className="flex-1 flex-row items-center justify-center py-2 px-3 rounded-lg border border-gray-200 bg-gray-50"
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="file-document-outline" size={16} color="#6B7280" />
            <Text className="text-gray-600 text-sm ml-2">{t('guidelines_btn')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onShelterLocations}
            className="flex-1 flex-row items-center justify-center py-2 px-3 rounded-lg border border-gray-200 bg-gray-50"
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="map-marker-outline" size={16} color="#6B7280" />
            <Text className="text-gray-600 text-sm ml-2">{t('shelter_locations_btn')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Share My Location & Status Button */}
      <CTAButtonOrange
        title={t('share_location_status')}
        onPress={onShareLocation}
        icon={<MaterialCommunityIcons name="crosshairs-gps" size={24} color="white" />}
        style={{ marginBottom: 12 }}
      />

      {/* Emergency Contact & Evacuation Routes Button */}
      <CTAButtonYellow
        title={t('emergency_contact_evacuation')}
        subtitle=""
        onPress={onEmergencyContact}
        icon={<MaterialCommunityIcons name="bell-outline" size={24} color="white" />}
      />
    </View>
  );
}
