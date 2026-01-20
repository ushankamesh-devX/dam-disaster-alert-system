import { ScreenLayout } from '@/components/ScreenLayout';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';

type Amenity = {
  id: string;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
};

type FacilityDetail = {
  id: string;
  label: string;
  value: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  status?: 'Available' | 'Open';
};

export default function SafeLocationDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; name?: string; area?: string; distanceKm?: string; tag?: string }>();

  const name = params.name ?? 'Central Evacuation Center';
  const area = params.area ?? 'City Hall area';
  const tag = (params.tag ?? 'Primary') as string;
  const distanceKm = params.distanceKm ?? '0.8';

  const heroImage = useMemo(() => require('../../assets/images/Emergency Contact/EvacuationCenter.jpg'), []);

  const facilityDetails: FacilityDetail[] = useMemo(
    () => [
      { id: 'cap', label: 'Capacity', value: '500 people', icon: 'account-group-outline', status: 'Available' },
      { id: 'hours', label: 'Opening Hours', value: '24/7 Emergency', icon: 'clock-outline', status: 'Open' },
      { id: 'loc', label: 'Location', value: '123 Main Street', icon: 'map-marker-outline' },
    ],
    [],
  );

  const amenities: Amenity[] = useMemo(
    () => [
      { id: 'a1', label: 'Medical Aid', icon: 'medical-bag' },
      { id: 'a2', label: 'Restrooms', icon: 'toilet' },
      { id: 'a3', label: 'Power Supply', icon: 'flash' },
      { id: 'a4', label: 'Pet Friendly', icon: 'paw' },
      { id: 'a5', label: 'Communication', icon: 'radio' },
      { id: 'a6', label: 'Food & Water', icon: 'food' },
    ],
    [],
  );

  return (
    <ScreenLayout title="Safe Locations" subtitle="Stay informed with live updates on the dam">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center justify-between mb-3">
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
          >
            <MaterialCommunityIcons name="arrow-left" size={22} color="#111827" />
          </TouchableOpacity>
          <View />
        </View>

        <View className="rounded-3xl overflow-hidden border border-gray-200 bg-white">
          <Image source={heroImage} resizeMode="cover" className="w-full h-56" />

          <View className="px-4 py-3">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-gray-900 text-base font-semibold" numberOfLines={1}>
                  {name}
                </Text>
                <Text className="text-gray-500 text-xs mt-1" numberOfLines={1}>
                  {distanceKm} km  {area}
                </Text>
              </View>

              <View className="px-3 py-1 rounded-full bg-green-100">
                <Text className="text-xs font-semibold text-green-700">{tag}</Text>
              </View>
            </View>

            <View className="flex-row gap-3 mt-4">
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Directions"
                className="flex-1 rounded-xl bg-blue-600 py-3 items-center justify-center flex-row"
              >
                <MaterialCommunityIcons name="navigation-variant" size={18} color="white" />
                <Text className="text-white font-semibold ml-2">Directions</Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Call"
                className="flex-1 rounded-xl bg-green-600 py-3 items-center justify-center flex-row"
              >
                <MaterialCommunityIcons name="phone" size={18} color="white" />
                <Text className="text-white font-semibold ml-2">Call</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View className="mt-5">
          <Text className="text-gray-900 text-sm font-semibold mb-3">Facility Details</Text>

          <View className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
            {facilityDetails.map((d) => (
              <View key={d.id} className="flex-row items-center justify-between py-2">
                <View className="flex-row items-center flex-1">
                  <View className="h-9 w-9 rounded-full bg-gray-100 items-center justify-center mr-3">
                    <MaterialCommunityIcons name={d.icon} size={18} color="#111827" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-700 text-xs">{d.label}</Text>
                    <Text className="text-gray-900 text-sm font-semibold" numberOfLines={1}>
                      {d.value}
                    </Text>
                  </View>
                </View>

                {d.status ? (
                  <Text className="text-green-700 text-xs font-semibold">{d.status}</Text>
                ) : null}
              </View>
            ))}
          </View>
        </View>

        <View className="mt-5">
          <Text className="text-gray-900 text-sm font-semibold mb-3">Available Amenities</Text>

          <View className="flex-row flex-wrap justify-between">
            {amenities.map((a) => (
              <View
                key={a.id}
                className="w-[48%] bg-white border border-gray-200 rounded-2xl px-3 py-3 mb-3 flex-row items-center"
              >
                <View className="h-8 w-8 rounded-full bg-green-100 items-center justify-center mr-2">
                  <MaterialCommunityIcons name="check" size={16} color="#16A34A" />
                </View>
                <Text className="text-gray-900 text-xs font-semibold flex-1">{a.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className="h-8" />
      </ScrollView>
    </ScreenLayout>
  );
}
