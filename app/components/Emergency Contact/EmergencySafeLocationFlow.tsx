import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { safeLocationService } from '@/services/safe-locations/safe-location.service';
import { EvacuationMapView } from './EvacuationMapView';

// Default emergency number for Sri Lanka Disaster Management Centre
const DEFAULT_EMERGENCY_NUMBER = '117';

type LocationTag = 'Nearby' | 'Emergency' | 'Safe' | 'Shelter';

type SafeLocation = {
  id: string;
  name: string;
  area: string;
  distanceKm: number;
  tag: LocationTag;
  phoneNumber: string;
  latitude: number;
  longitude: number;
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
};

const TAG_CYCLE: LocationTag[] = ['Nearby', 'Emergency', 'Safe', 'Shelter'];

const FALLBACK_LOCATIONS: SafeLocation[] = [
  { id: '1', name: 'Central Evacuation Center', area: 'City Hall area', distanceKm: 2.1, tag: 'Nearby', phoneNumber: DEFAULT_EMERGENCY_NUMBER, latitude: 6.9271, longitude: 79.8612 },
  { id: '2', name: 'Riverside Community Hall', area: 'Riverside', distanceKm: 3.4, tag: 'Emergency', phoneNumber: DEFAULT_EMERGENCY_NUMBER, latitude: 6.9319, longitude: 79.8478 },
  { id: '3', name: 'Northside School Shelter', area: 'North District', distanceKm: 5.7, tag: 'Safe', phoneNumber: DEFAULT_EMERGENCY_NUMBER, latitude: 6.9530, longitude: 79.8500 },
  { id: '4', name: 'Downtown Safe Zone', area: 'Downtown', distanceKm: 1.8, tag: 'Shelter', phoneNumber: DEFAULT_EMERGENCY_NUMBER, latitude: 6.9147, longitude: 79.9714 },
];

function mapApiLocation(item: Record<string, unknown>, index: number): SafeLocation {
  const pos = MARKER_POSITIONS[index % MARKER_POSITIONS.length];
  return {
    id: String(item.id ?? item.uuid ?? index),
    name: String(item.name ?? item.locationName ?? ''),
    area: String(item.area ?? item.address ?? item.district ?? item.code ?? ''),
    distanceKm: Number(item.distanceKm ?? item.distance ?? 0),
    tag: TAG_CYCLE[index % TAG_CYCLE.length],
    phoneNumber: String(item.phoneNumber ?? item.contactNumber ?? item.phone ?? DEFAULT_EMERGENCY_NUMBER),
    latitude: Number(item.latitude ?? item.lat ?? 0),
    longitude: Number(item.longitude ?? item.lng ?? item.lon ?? 0),
  };
}

function openDirections(lat: number, lng: number, name: string) {
  const encoded = encodeURIComponent(name);
  const url = Platform.select({
    ios: lat && lng
      ? `maps:?daddr=${lat},${lng}&q=${encoded}`
      : `maps:?q=${encoded}`,
    default: lat && lng
      ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encoded}`,
  });
  if (url) Linking.openURL(url).catch(() => {});
}

function makeCall(phone: string) {
  Linking.openURL(`tel:${phone}`).catch(() => {});
}

function getTagStyles(tag: LocationTag) {
  switch (tag) {
    case 'Nearby':   return { pill: 'bg-green-100', text: 'text-green-700' };
    case 'Emergency': return { pill: 'bg-red-100', text: 'text-red-700' };
    case 'Safe':     return { pill: 'bg-blue-100', text: 'text-blue-700' };
    case 'Shelter':  return { pill: 'bg-purple-100', text: 'text-purple-700' };
    default:         return { pill: 'bg-gray-100', text: 'text-gray-700' };
  }
}

export function EmergencySafeLocationFlow() {
  const router = useRouter();
  const { t } = useTranslation();
  const [selected, setSelected] = useState<SafeLocation | null>(null);
  const [locations, setLocations] = useState<SafeLocation[]>(FALLBACK_LOCATIONS);
  const [loading, setLoading] = useState(true);

  const evacuationCenterImage = useMemo(
    () => require('../../assets/images/Emergency Contact/EvacuationCenter.jpg'),
    [],
  );

  useEffect(() => {
    safeLocationService
      .getList()
      .then((res) => {
        const raw: Record<string, unknown>[] = Array.isArray(res.data)
          ? res.data
          : (res.data?.data ?? res.data?.content ?? res.data?.locations ?? []);
        if (raw.length > 0) setLocations(raw.map(mapApiLocation));
      })
      .catch(() => {/* keep fallback */})
      .finally(() => setLoading(false));
  }, []);

  const onMapLocationSelect = useCallback(
    (raw: Record<string, unknown>) => {
      setSelected(mapApiLocation(raw, 0));
    },
    [],
  );

  const facilityDetails: FacilityDetail[] = useMemo(
    () => [
      { id: 'cap', label: t('cap_capacity'), value: '500 people', icon: 'account-group-outline', status: t('status_available') },
      { id: 'hours', label: t('cap_hours'), value: '24/7 Emergency', icon: 'clock-outline', status: t('status_available') },
      { id: 'loc', label: t('cap_location'), value: selected ? `${selected.latitude.toFixed(4)}, ${selected.longitude.toFixed(4)}` : '—', icon: 'map-marker-outline' },
    ],
    [t, selected],
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
      case 'Nearby':    return t('tag_nearby');
      case 'Emergency': return t('tag_emergency');
      case 'Safe':      return t('tag_safe');
      case 'Shelter':   return t('tag_shelter');
      default:          return tag;
    }
  };

  // ── Detail view ──────────────────────────────────────────────────────────────
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
                onPress={() => openDirections(selected.latitude, selected.longitude, selected.name)}
                className="flex-1 rounded-xl bg-blue-600 py-3 items-center justify-center flex-row"
              >
                <MaterialCommunityIcons name="navigation-variant" size={18} color="white" />
                <Text className="text-white font-semibold ml-2">{t('directions')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Call"
                onPress={() => makeCall(selected.phoneNumber)}
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

        {/* Quick emergency call strip */}
        <View className="mt-2 mb-3 bg-red-50 border border-red-100 rounded-2xl px-4 py-3 flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-red-700 text-xs font-bold uppercase">Emergency Hotline</Text>
            <Text className="text-red-900 text-sm font-semibold mt-0.5">{selected.phoneNumber}</Text>
          </View>
          <TouchableOpacity
            onPress={() => makeCall(selected.phoneNumber)}
            className="bg-red-600 rounded-xl px-4 py-2 flex-row items-center"
          >
            <MaterialCommunityIcons name="phone" size={16} color="white" />
            <Text className="text-white text-xs font-bold ml-1">Call Now</Text>
          </TouchableOpacity>
        </View>

        <View className="h-8" />
      </ScrollView>
    );
  }

  // ── List view ────────────────────────────────────────────────────────────────
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
          onPress={() => {
            setLoading(true);
            safeLocationService
              .getList()
              .then((res) => {
                const raw: Record<string, unknown>[] = Array.isArray(res.data)
                  ? res.data
                  : (res.data?.data ?? res.data?.content ?? res.data?.locations ?? []);
                if (raw.length > 0) setLocations(raw.map(mapApiLocation));
              })
              .catch(() => {})
              .finally(() => setLoading(false));
          }}
          className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
        >
          <MaterialCommunityIcons name="compass-outline" size={22} color="#111827" />
        </TouchableOpacity>
      </View>

      <EvacuationMapView height={260} onLocationSelect={onMapLocationSelect} />

      {/* National emergency call banner */}
      <TouchableOpacity
        onPress={() => makeCall(DEFAULT_EMERGENCY_NUMBER)}
        className="mt-4 bg-red-600 rounded-2xl px-4 py-3 flex-row items-center justify-between"
        activeOpacity={0.85}
      >
        <View className="flex-row items-center">
          <MaterialCommunityIcons name="phone-alert" size={22} color="white" />
          <View className="ml-3">
            <Text className="text-white text-xs font-bold uppercase tracking-wide">Disaster Management Centre</Text>
            <Text className="text-white text-base font-bold">{DEFAULT_EMERGENCY_NUMBER}</Text>
          </View>
        </View>
        <View className="bg-white/20 rounded-xl px-3 py-1">
          <Text className="text-white text-xs font-bold">Call Now</Text>
        </View>
      </TouchableOpacity>

      <View className="mt-5">
        <Text className="text-gray-900 text-base font-semibold mb-3">{t('nearby_safe_locations')}</Text>

        {loading && <ActivityIndicator size="small" color="#2563eb" className="mb-3" />}

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

                <View className="flex-row items-center justify-between mt-2">
                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation(); makeCall(loc.phoneNumber); }}
                    className="flex-row items-center"
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialCommunityIcons name="phone-outline" size={14} color="#16A34A" />
                    <Text className="text-green-600 text-xs font-semibold ml-1">Call</Text>
                  </TouchableOpacity>

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
