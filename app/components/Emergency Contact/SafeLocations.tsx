import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  Linking,
  Image,
  StyleSheet,
  type ImageSourcePropType,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export type SafeLocationsProps = {
  mapImageSource?: ImageSourcePropType;
};

type LocationTag = 'Nearby' | 'Emergency' | 'Safe' | 'Shelter';

type SafeLocation = {
  id: string;
  name: string;
  area: string;
  distanceKm: number;
  tag: LocationTag;
  query: string; // used for opening directions
  marker: {
    top: number; // percent
    left: number; // percent
    color: string;
  };
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

function openDirections(query: string) {
  const encoded = encodeURIComponent(query);
  const url = Platform.select({
    ios: `http://maps.apple.com/?q=${encoded}`,
    default: `https://www.google.com/maps/search/?api=1&query=${encoded}`,
  });

  if (!url) return;
  Linking.openURL(url).catch(() => {
    // ignore
  });
}

export function SafeLocations({ mapImageSource }: SafeLocationsProps = {}) {
  const router = useRouter();
  const locations: SafeLocation[] = useMemo(
    () => [
      {
        id: '1',
        name: 'Central Evacuation Center',
        area: 'City Hall area',
        distanceKm: 2.1,
        tag: 'Nearby',
        query: 'Central Evacuation Center',
        marker: { top: 55, left: 20, color: '#F59E0B' },
      },
      {
        id: '2',
        name: 'Riverside Community Hall',
        area: 'Riverside',
        distanceKm: 3.4,
        tag: 'Emergency',
        query: 'Riverside Community Hall',
        marker: { top: 50, left: 62, color: '#22C55E' },
      },
      {
        id: '3',
        name: 'Northside School Shelter',
        area: 'North District',
        distanceKm: 5.7,
        tag: 'Safe',
        query: 'Northside School Shelter',
        marker: { top: 64, left: 72, color: '#22C55E' },
      },
      {
        id: '4',
        name: 'Downtown Safe Zone',
        area: 'Downtown',
        distanceKm: 1.8,
        tag: 'Shelter',
        query: 'Downtown Safe Zone',
        marker: { top: 40, left: 52, color: '#3B82F6' },
      },
    ],
    [],
  );

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      {/* Top row inside white area (matches screenshot style) */}
      <View className="flex-row items-center justify-between mb-3">
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.replace('/')}
          className="h-10 w-10 items-center justify-center rounded-full"
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color="#111827" />
        </TouchableOpacity>

        <View className="flex-1 items-center">
          <Text className="text-gray-900 text-lg font-semibold">Safe Locations</Text>
          <Text className="text-gray-500 text-xs mt-0.5">Stay informed and ready in disaster</Text>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Refresh"
          className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
        >
          <MaterialCommunityIcons name="compass-outline" size={22} color="#111827" />
        </TouchableOpacity>
      </View>

      {/* Map card (stylized placeholder, no extra deps) */}
      <View className="rounded-3xl overflow-hidden border border-gray-200 bg-slate-100 h-60 relative">
        {/* Optional real map image behind everything */}
        {mapImageSource ? (
          <Image
            source={mapImageSource}
            resizeMode="cover"
            style={StyleSheet.absoluteFill}
          />
        ) : null}

        {/* Soft overlay so markers/text stay readable */}
        <View className="absolute inset-0 bg-white/20" />

        {/* Faux map lines */}
        <View className="absolute inset-0 opacity-60">
          <View className="absolute left-6 top-10 right-6 h-[1px] bg-slate-300" />
          <View className="absolute left-6 top-24 right-6 h-[1px] bg-slate-300" />
          <View className="absolute left-6 top-40 right-6 h-[1px] bg-slate-300" />
          <View className="absolute top-6 bottom-6 left-10 w-[1px] bg-slate-300" />
          <View className="absolute top-6 bottom-6 left-32 w-[1px] bg-slate-300" />
          <View className="absolute top-6 bottom-6 left-56 w-[1px] bg-slate-300" />
          <View className="absolute top-10 left-12 h-20 w-28 rounded-3xl border border-slate-300" />
          <View className="absolute top-28 right-10 h-24 w-32 rounded-3xl border border-slate-300" />
        </View>

        {/* Markers */}
        {locations.slice(0, 3).map((loc) => (
          <View
            key={loc.id}
            style={{
              position: 'absolute',
              top: `${loc.marker.top}%`,
              left: `${loc.marker.left}%`,
              transform: [{ translateX: -14 }, { translateY: -14 }],
            }}
          >
            <View className="h-7 w-7 rounded-full items-center justify-center" style={{ backgroundColor: `${loc.marker.color}33` }}>
              <View className="h-4 w-4 rounded-full" style={{ backgroundColor: loc.marker.color }} />
            </View>
          </View>
        ))}

        {/* Current location button */}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="My location"
          className="absolute right-4 top-4 h-11 w-11 rounded-full bg-blue-600 items-center justify-center shadow"
        >
          <MaterialCommunityIcons name="crosshairs-gps" size={22} color="white" />
        </TouchableOpacity>
      </View>

      {/* List */}
      <View className="mt-5">
        <Text className="text-gray-900 text-base font-semibold mb-3">Nearby Safe Locations</Text>

        <View className="gap-3">
          {locations.map((loc) => {
            const tag = getTagStyles(loc.tag);
            return (
              <TouchableOpacity
                key={loc.id}
                activeOpacity={0.85}
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/safe-location/[id]',
                    params: {
                      id: loc.id,
                      name: loc.name,
                      area: loc.area,
                      distanceKm: String(loc.distanceKm),
                      tag: loc.tag,
                    },
                  })
                }
                className="bg-white border border-gray-200 rounded-2xl px-4 py-3"
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-gray-900 text-base font-semibold" numberOfLines={1}>
                      {loc.name}
                    </Text>
                    <Text className="text-gray-500 text-xs mt-1" numberOfLines={1}>
                      {loc.area}  {loc.distanceKm.toFixed(1)} km
                    </Text>
                  </View>

                  <View className={`px-3 py-1 rounded-full ${tag.pill}`}>
                    <Text className={`text-xs font-semibold ${tag.text}`}>{loc.tag}</Text>
                  </View>
                </View>

                <View className="flex-row items-center justify-end mt-2">
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Directions to ${loc.name}`}
                    onPress={() => openDirections(loc.query)}
                    className="flex-row items-center"
                  >
                    <Text className="text-blue-600 text-xs font-semibold">Directions</Text>
                    <MaterialCommunityIcons name="chevron-right" size={18} color="#2563EB" />
                  </TouchableOpacity>
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
