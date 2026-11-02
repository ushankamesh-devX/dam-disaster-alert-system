import React, { useState } from 'react';
import { ScrollView, View, Text, Pressable, useWindowDimensions } from 'react-native';
import { HazardGauge } from './HazardGauge';
import { LiveHazardMapView } from './LiveHazardMapView';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface HazardLevel { level: string; label: string; description: string; color: string; }
interface FullMapViewProps {
  focusDamId?: string;
  level?: number;
  hazardValue?: string;
  hazardLevels?: HazardLevel[];
  onMapTouchStart?: () => void;
  onMapTouchEnd?: () => void;
  showZones?: boolean;
  showLocations?: boolean;
  showDams?: boolean;
  onToggleZones?: () => void;
  onToggleLocations?: () => void;
}

export function FullMapView({
  focusDamId, level = 0, hazardValue = 'Unavailable', hazardLevels = [],
  onMapTouchStart, onMapTouchEnd, showZones = true, showLocations = true,
  showDams = true, onToggleZones, onToggleLocations,
}: FullMapViewProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { height, width } = useWindowDimensions();
  const mapHeight = Math.max(320, Math.min(560, height * 0.6));
  return <View className="bg-white rounded-2xl overflow-hidden">
    <View style={{ height: mapHeight }}
      onTouchStart={() => { setDetailsOpen(false); onMapTouchStart?.(); }} onTouchEnd={onMapTouchEnd} onTouchCancel={onMapTouchEnd}>
      <LiveHazardMapView focusDamId={focusDamId} showZones={showZones} showLocations={showLocations} showDams={showDams} />
    </View>
    <View pointerEvents="box-none" className="flex-row items-start" style={{ position: 'absolute', top: 10, left: 10, right: 10, gap: 6 }}>
      <View pointerEvents="box-none" className="flex-row flex-wrap flex-1" style={{ gap: 6 }}>
      {[
        { label: 'Areas', accessibleLabel: 'Hazard areas', active: showZones, toggle: onToggleZones, icon: 'vector-polygon' as const },
        { label: 'Places', accessibleLabel: 'Safe places', active: showLocations, toggle: onToggleLocations, icon: 'map-marker-check-outline' as const },
      ].filter(item => item.toggle).map(item => <Pressable key={item.label}
        accessibilityRole="switch" accessibilityLabel={item.accessibleLabel} accessibilityState={{ checked: item.active }}
        onPress={item.toggle} className="flex-row items-center rounded-full px-2"
        style={{ minHeight: 44, elevation: 2, borderWidth: 1, borderColor: item.active ? '#99D5CE' : '#CBD5E1', backgroundColor: item.active ? '#E0F2F1' : '#FFFFFF' }}>
        <MaterialCommunityIcons name={item.icon} size={18} color={item.active ? '#0F766E' : '#64748B'} />
        <Text style={{ color: item.active ? '#0F766E' : '#64748B', marginLeft: 6, fontSize: 12, fontWeight: '600' }}>{item.label}</Text>
        <MaterialCommunityIcons name={item.active ? 'check' : 'minus'} size={15} color={item.active ? '#0F766E' : '#64748B'} style={{ marginLeft: 6 }} />
      </Pressable>)}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Map gauge and legend" accessibilityState={{ expanded: detailsOpen }}
        onPress={() => setDetailsOpen(value => !value)} className="items-center justify-center rounded-full" style={{ width: 44, height: 44, backgroundColor: '#FFFFFF', elevation: 2 }}>
        <MaterialCommunityIcons name="dots-vertical" size={24} color="#475569" />
      </Pressable>
    </View>
    {detailsOpen && <View className="bg-white rounded-xl" style={{ position: 'absolute', top: 62, right: 10, width: Math.min(190, width - 64), maxHeight: mapHeight - 76, elevation: 5, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }}>
      <View className="flex-row items-center justify-between pl-3">
        <Text className="text-gray-800 font-semibold text-xs">Map key</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Close map details" onPress={() => setDetailsOpen(false)} style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }}>
          <MaterialCommunityIcons name="close" size={18} color="#475569" />
        </Pressable>
      </View>
      <ScrollView nestedScrollEnabled style={{ flexShrink: 1 }} contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 10 }}>
        <View className="items-center mb-2"><HazardGauge level={level} hazardValue={hazardValue} /></View>
        {hazardLevels.length === 0 && <Text className="text-gray-500 text-xs">No hazard areas.</Text>}
        {hazardLevels.map(hazard => <View key={`${hazard.level}:${hazard.label}`} className="flex-row items-center py-1">
          <View style={{ width: 10, height: 10, backgroundColor: hazard.color, borderRadius: 2, marginRight: 6 }} />
          <Text className="text-gray-800 flex-1" style={{ fontSize: 11, lineHeight: 14 }}>{hazard.label}</Text>
        </View>)}
      </ScrollView>
    </View>}
  </View>;
}
