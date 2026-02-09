import React, { useMemo, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

type LocationTag = 'Nearby' | 'Emergency' | 'Safe' | 'Shelter';

type SafeLocation = {
  id: string;
  name: string;
  area: string;
  distanceKm: number;
  tag: LocationTag;
};

type MapMarker = {
  id: SafeLocation['id'];
  topPct: number;
  leftPct: number;
  color: string;
};

type FacilityDetail = {
  id: string;
  label: string;
  value: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  status?: string;
};

type Amenity = {
  id: string;
  label: string;
  value?: string; // dummy for lint
};

function getTagStyles(tag: LocationTag) {
  switch (tag) {
    case 'Nearby':
      return { pill: 'bg-green-100', text: 'text-green-700' };
    case 'Emergency':
      return { pill: 'bg-red-100', text: 'text-red-700' };
    case 'Safe':
      return { pill: 'bg-blue-100', text: 'text-blue-700' };
    case 'Shelter':
      return { pill: 'bg-purple-100', text: 'text-purple-700' };
    default:
      return { pill: 'bg-gray-100', text: 'text-gray-700' };
  }
}

export function EmergencySafeLocationFlow() {
  const router = useRouter();
  const { t } = useTranslation();
  const [selected, setSelected] = useState<SafeLocation | null>(null);

  const mapImage = useMemo(
    () => require('../../assets/images/Emergency Contact/Google map.png'),
    [],
  );

  const evacuationCenterImage = useMemo(
    () => require('../../assets/images/Emergency Contact/EvacuationCenter.jpg'),
    [],
  );

  const locations: SafeLocation[] = useMemo(
    () => [
      { id: '1', name: 'Central Evacuation Center', area: 'City Hall area', distanceKm: 2.1, tag: 'Nearby' },
      { id: '2', name: 'Riverside Community Hall', area: 'Riverside', distanceKm: 3.4, tag: 'Emergency' },
      { id: '3', name: 'Northside School Shelter', area: 'North District', distanceKm: 5.7, tag: 'Safe' },
      { id: '4', name: 'Downtown Safe Zone', area: 'Downtown', distanceKm: 1.8, tag: 'Shelter' },
    ],
    [],
  );

  const markers: MapMarker[] = useMemo(
    () => [
      { id: '1', topPct: 54, leftPct: 26, color: '#22C55E' }, // Nearby (green)
      { id: '2', topPct: 48, leftPct: 62, color: '#EF4444' }, // Emergency (red)
      { id: '3', topPct: 64, leftPct: 74, color: '#3B82F6' }, // Safe (blue)
      { id: '4', topPct: 40, leftPct: 52, color: '#8B5CF6' }, // Shelter (purple)
    ],
    [],
  );

  const facilityDetails: FacilityDetail[] = useMemo(
    () => [
      { id: 'cap', label: t('cap_capacity'), value: '500 people', icon: 'account-group-outline', status: t('status_available') },
      { id: 'hours', label: t('cap_hours'), value: '24/7 Emergency', icon: 'clock-outline', status: t('status_available') },
      { id: 'loc', label: t('cap_location'), value: '123 Main Street', icon: 'map-marker-outline' },
    ],
    [t],
  );

  const amenities: Amenity[] = useMemo(
    () => [
      { id: 'a1', label: t('amenity_medical') },
      { id: 'a2', label: t('amenity_restrooms') },
      { id: 'a3', label: t('amenity_power') },
      { id: 'a4', label: t('amenity_pet') },
      { id: 'a5', label: t('amenity_comm') },
      { id: 'a6', label: t('amenity_food') },
    ],
    [t],
  );

  const getTagLabel = (tag: LocationTag) => {
    switch (tag) {
      case 'Nearby': return t('tag_nearby');
      case 'Emergency': return t('tag_emergency');
      case 'Safe': return t('tag_safe');
      case 'Shelter': return t('tag_shelter');
      default: return tag;
    }
  }

  if (selected) {
    const tagStyles = getTagStyles(selected.tag);

    return (
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center justify-between mb-3">
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Back to map"
            onPress={() => setSelected(null)}
            className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
          >
            <MaterialCommunityIcons name="arrow-left" size={22} color="#111827" />
          </TouchableOpacity>
          <View />
        </View>

        <View className="rounded-3xl overflow-hidden border border-gray-200 bg-white">
          <Image source={evacuationCenterImage} resizeMode="cover" className="w-full h-56" />

          <View className="px-4 py-3">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-gray-900 text-base font-semibold" numberOfLines={1}>
                  {selected.name}
                </Text>
                <Text className="text-gray-500 text-xs mt-1" numberOfLines={1}>
                  {selected.distanceKm.toFixed(1)} km away
                </Text>
              </View>

              <View className={`px-3 py-1 rounded-full ${tagStyles.pill}`}>
                <Text className={`text-xs font-semibold ${tagStyles.text}`}>{getTagLabel(selected.tag)}</Text>
              </View>
            </View>

            <View className="flex-row gap-3 mt-4">
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Directions"
                className="flex-1 rounded-xl bg-blue-600 py-3 items-center justify-center flex-row"
              >
                <MaterialCommunityIcons name="navigation-variant" size={18} color="white" />
                <Text className="text-white font-semibold ml-2">{t('directions')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Call"
                className="flex-1 rounded-xl bg-green-600 py-3 items-center justify-center flex-row"
              >
                <MaterialCommunityIcons name="phone" size={18} color="white" />
                <Text className="text-white font-semibold ml-2">{t('call')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View className="mt-5">
          <Text className="text-gray-900 text-sm font-semibold mb-3">{t('facility_details')}</Text>
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

                {d.status ? <Text className="text-green-700 text-xs font-semibold">{d.status}</Text> : null}
              </View>
            ))}
          </View>
        </View>

        <View className="mt-5">
          <Text className="text-gray-900 text-sm font-semibold mb-3">{t('available_amenities')}</Text>
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
    );
  }

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="flex-row items-center justify-between mb-3">
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Back to dashboard"
          onPress={() => router.replace('/')}
          className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color="#111827" />
        </TouchableOpacity>

        <View className="flex-1 items-center">
          <Text className="text-gray-900 text-lg font-semibold">{t('safe_locations_title')}</Text>
          <Text className="text-gray-500 text-xs mt-0.5">{t('safe_locations_subheading')}</Text>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Refresh"
          className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
        >
          <MaterialCommunityIcons name="compass-outline" size={22} color="#111827" />
        </TouchableOpacity>
      </View>

      <View className="rounded-3xl overflow-hidden border border-gray-200 bg-slate-100 h-60 relative">
        <Image source={mapImage} resizeMode="cover" className="w-full h-full absolute" />
        <View className="absolute inset-0 bg-white/10" />

        {/* Safe location markers */}
        {markers.map((m) => {
          const loc = locations.find((l) => l.id === m.id);
          if (!loc) return null;
          return (
            <TouchableOpacity
              key={m.id}
              accessibilityRole="button"
              accessibilityLabel={`Open ${loc.name}`}
              onPress={() => setSelected(loc)}
              style={{
                position: 'absolute',
                top: `${m.topPct}%`,
                left: `${m.leftPct}%`,
                transform: [{ translateX: -16 }, { translateY: -16 }],
              }}
              className="h-8 w-8 rounded-full items-center justify-center"
            >
              <View
                className="h-8 w-8 rounded-full items-center justify-center"
                style={{ backgroundColor: `${m.color}33` }}
              >
                <View className="h-4 w-4 rounded-full" style={{ backgroundColor: m.color }} />
              </View>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="My location"
          className="absolute right-4 top-4 h-11 w-11 rounded-full bg-blue-600 items-center justify-center shadow"
        >
          <MaterialCommunityIcons name="crosshairs-gps" size={22} color="white" />
        </TouchableOpacity>
      </View>

      <View className="mt-5">
        <Text className="text-gray-900 text-base font-semibold mb-3">{t('nearby_safe_locations')}</Text>

        <View className="gap-3">
          {locations.map((loc) => {
            const tag = getTagStyles(loc.tag);
            return (
              <TouchableOpacity
                key={loc.id}
                activeOpacity={0.85}
                onPress={() => setSelected(loc)}
                className="bg-white border border-gray-200 rounded-2xl px-4 py-3"
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-gray-900 text-base font-semibold" numberOfLines={1}>
                      {loc.name}
                    </Text>
                    <Text className="text-gray-500 text-xs mt-1" numberOfLines={1}>
                      {loc.area}  {loc.distanceKm.toFixed(1)} km
                    </Text>
                  </View>

                  <View className={`px-3 py-1 rounded-full ${tag.pill}`}>
                    <Text className={`text-xs font-semibold ${tag.text}`}>{getTagLabel(loc.tag)}</Text>
                  </View>
                </View>

                <View className="flex-row items-center justify-end mt-2">
                  <View className="flex-row items-center">
                    <Text className="text-blue-600 text-xs font-semibold">{t('details')}</Text>
                    <MaterialCommunityIcons name="chevron-right" size={18} color="#2563EB" />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View className="h-8" />
    </ScrollView>
  );
}
