import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { HazardCard } from './HazardCard';
import { type DashboardSnapshot, formatMeasurement as metric, formatRecordedTime as time } from '@/services/dams/dashboard.service';

export function DamOverview({ data, loading, error, onRetry }: {
  data: DashboardSnapshot | null; loading: boolean; error: boolean; onRetry: () => void;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const current = data?.current;
  const status = loading || error ? 'unavailable' : current?.hazardStatus?.toLowerCase() ?? 'unavailable';
  const labels: Record<string, string> = { safe: 'Normal', low: 'Low', moderate: 'Moderate', high: 'High', severe: 'Severe', critical: 'Critical' };
  const demo = data?.dam.code.startsWith('DEMO-') ?? false;
  const percentage = current?.waterLevelPercentage;
  const level = !loading && !error && percentage != null && Number.isFinite(Number(percentage)) ? Number(percentage) : null;
  return <HazardCard level={level} hazardValue={level == null ? '—' : metric(level, '%')}
    title="Dam alert" subtitle={data?.dam.name ?? 'Your selected dam'} status={status}
    statusLabel={loading ? 'Loading' : labels[status] ?? 'No update'}>
    <View className="mx-4 pb-3 border-t border-white/20 pt-3">
      {loading ? <View className="flex-row items-center py-2"><ActivityIndicator color="white" /><Text className="text-gray-200 ml-3">Checking for updates…</Text></View> : error || !data ? <>
        <Text accessibilityRole="alert" className="text-white">Can’t get an update. Check your connection.</Text>
        <Pressable accessibilityRole="button" onPress={() => router.push('/settings')} className="py-3"><Text className="text-white font-bold">Choose another dam</Text></Pressable>
      </> : <>
        {demo && <Text className="text-amber-200 text-xs mb-3">Demo · not a live warning</Text>}
        {data.measurementsFailed || !current ? <Text accessibilityRole="alert" className="text-gray-200 text-sm mb-3">Water reading not available yet.</Text> : null}
        <View className="flex-row items-center mb-2"><MaterialCommunityIcons name="clock-outline" size={18} color="#E2E8F0" /><Text className="text-white text-sm font-semibold ml-2">Coming hours</Text></View>
        {data.forecastsFailed || !data.forecasts.length ? <View className="flex-row items-center py-2"><MaterialCommunityIcons name="help-circle-outline" size={24} color="#CBD5E1" /><Text className="text-gray-200 text-sm ml-2">Forecast not available yet</Text></View> : <View className="flex-row" style={{ gap: 8 }}>
          {data.forecasts.slice(0, 3).map(row => {
            const canCompare = row.levelP50 != null && current?.waterLevelMeters != null;
            const difference = canCompare ? Number(row.levelP50) - Number(current!.waterLevelMeters) : 0;
            const icon = !canCompare ? 'waves' : difference > 0 ? 'arrow-top-right' : difference < 0 ? 'arrow-bottom-right' : 'arrow-right';
            const label = !canCompare ? 'No comparison' : difference > 0 ? 'May rise' : difference < 0 ? 'May fall' : 'May stay level';
            return <View key={row.id} className="flex-1 items-center rounded-xl px-1 py-3" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
              <Text className="text-gray-200 text-xs">In {row.horizonHours}h</Text>
              <MaterialCommunityIcons name={icon} size={30} color="white" style={{ marginVertical: 5 }} />
              <Text className="text-white text-xs font-semibold text-center">{label}</Text>
              {(row.demoMode && !demo || row.freshness !== 'fresh') && <Text className="text-amber-200 text-xs text-center mt-1">{row.demoMode && !demo ? 'Demo' : 'Older / limited data'}</Text>}
            </View>;
          })}
        </View>}
        <View className="flex-row items-center justify-between mt-2">
          <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)} className="flex-row items-center py-3 pr-3"><Text className="text-gray-200 text-sm">{expanded ? 'Hide details' : 'View details'}</Text><MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color="#E2E8F0" /></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Refresh dam update" onPress={onRetry} className="p-3"><MaterialCommunityIcons name="refresh" size={22} color="white" /></Pressable>
        </View>
        {expanded && <View className="border-t border-white/20 pt-3">
          {[
            ['Water height', metric(current?.waterLevelMeters, 'm')],
            ['Water flowing in', metric(current?.inflowCumecs, 'm³/s')],
            ['Water flowing out', metric(current?.outflowCumecs, 'm³/s')],
            ['Water stored', metric(current?.storageCurrentMcm, 'million m³')],
            ['Total capacity', metric(data.dam.reservoirCapacityMcm, 'million m³')],
          ].map(([label, value]) => <View key={label} className="flex-row justify-between mb-2"><Text className="text-gray-200 text-xs flex-1">{label}</Text><Text className="text-white text-xs">{value}</Text></View>)}
          <Text className="text-gray-200 text-xs mt-2">Reading: {time(current?.lastSensorReadingAt)}</Text>
          <Text className="text-gray-200 text-xs mt-1">Status checked: {time(current?.lastHazardAssessmentAt)}</Text>
          {data.forecasts.map(row => <View key={row.id} className="mt-3">
            <Text className="text-white text-xs">In {row.horizonHours} hours: about {metric(row.levelP50, 'm')}</Text>
            <Text className="text-gray-200 text-xs mt-1">Estimated range: {metric(row.levelP10, 'm')} to {metric(row.levelP90, 'm')}</Text>
            <Text className="text-gray-200 text-xs mt-1">Chance of overflow: {row.overflowProbability != null && row.overflowProbability >= 0 && row.overflowProbability <= 1 ? metric(row.overflowProbability * 100, '%') : 'Unavailable'}</Text>
            <Text className="text-gray-200 text-xs mt-1">Forecast made: {time(row.issuedAt)}</Text>
            <Text className="text-gray-200 text-xs mt-1">For: {time(row.targetTime)} · Data: {row.freshness ?? 'unknown'}</Text>
          </View>)}
        </View>}
      </>}
      {!loading && (error || data?.measurementsFailed || data?.forecastsFailed) && <Pressable accessibilityRole="button" onPress={onRetry} className="py-3"><Text className="text-white font-bold">Try again</Text></Pressable>}
    </View>
  </HazardCard>;
}
