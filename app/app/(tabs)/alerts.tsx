/**
 * alerts.tsx — Alerts Tab Screen with Live Sound Alerts
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, RefreshControl,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeIn, useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from 'react-native-reanimated';
import { ScreenLayout } from '@/components/ScreenLayout';
import { AlertCard } from '@/components/AlertCard';
import { AlertDetailModal } from '@/components/AlertDetailModal';
import { useAlerts, type SeverityFilter } from '@/hooks/useAlerts';
import { playAlertSound } from '@/services/alertSound';
import { useTranslation } from 'react-i18next';
import type { Alert } from '@/types/alert';

// ─── Filter chips ─────────────────────────────────────────────────────────────
type FilterChip = { key: SeverityFilter; label: string; activeBg: string; defaultBg: string };
const FILTER_CHIPS: FilterChip[] = [
  { key: 'all',       label: 'All',       activeBg: '#455A64', defaultBg: '#F3F4F6' },
  { key: 'emergency', label: 'Emergency', activeBg: '#DC2626', defaultBg: '#FEE2E2' },
  { key: 'critical',  label: 'Critical',  activeBg: '#EF4444', defaultBg: '#FEF2F2' },
  { key: 'warning',   label: 'Warning',   activeBg: '#F59E0B', defaultBg: '#FFFBEB' },
  { key: 'info',      label: 'Info',      activeBg: '#3B82F6', defaultBg: '#EFF6FF' },
];

// ─── Pulsing sound wave icon (shown for emergency/critical alerts) ─────────────
function SoundPulseIcon({ severity }: { severity: string }) {
  const scale = useSharedValue(1);
  React.useEffect(() => {
    scale.value = withRepeat(
      withSequence(withTiming(1.3, { duration: 400 }), withTiming(1, { duration: 400 })),
      -1, true,
    );
  }, []);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const color = severity === 'emergency' ? '#DC2626' : '#EF4444';
  return (
    <Animated.View style={animStyle}>
      <MaterialCommunityIcons name="volume-high" size={16} color={color} />
    </Animated.View>
  );
}

// ─── Stats row ────────────────────────────────────────────────────────────────
function StatsRow({ emergency, critical, warning, info }: {
  emergency: number; critical: number; warning: number; info: number;
}) {
  const items = [
    { count: emergency + critical, label: 'Critical', color: '#EF4444', bg: '#FEF2F2', border: '#FCA5A5' },
    { count: warning,              label: 'Warnings',  color: '#F59E0B', bg: '#FFFBEB', border: '#FCD34D' },
    { count: info,                 label: 'Updates',   color: '#3B82F6', bg: '#EFF6FF', border: '#93C5FD' },
  ];
  return (
    <View className="flex-row px-1 mb-5 mt-2 gap-2">
      {items.map((item) => (
        <View
          key={item.label}
          style={{ backgroundColor: item.bg, borderColor: item.border, borderWidth: 1 }}
          className="flex-1 rounded-2xl p-3 items-center shadow-sm"
        >
          <View className="flex-row items-center gap-1">
            <Text style={{ color: item.color }} className="font-bold text-xl">{item.count}</Text>
            {item.count > 0 && item.label === 'Critical' && (
              <SoundPulseIcon severity="critical" />
            )}
          </View>
          <Text style={{ color: item.color }} className="text-[10px] uppercase font-bold mt-0.5">
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ filter }: { filter: SeverityFilter }) {
  return (
    <View className="items-center justify-center py-20">
      <MaterialCommunityIcons name="shield-check" size={64} color="#D1D5DB" />
      <Text className="text-gray-400 text-lg font-semibold mt-4">
        {filter === 'all' ? 'No Active Alerts' : `No ${filter} alerts`}
      </Text>
      <Text className="text-gray-300 text-sm mt-1 text-center px-8">
        Pull down to refresh. Sound will play when new alerts arrive.
      </Text>
    </View>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View className="items-center justify-center py-20 px-6">
      <MaterialCommunityIcons name="wifi-off" size={56} color="#FCA5A5" />
      <Text className="text-red-500 text-base font-bold mt-4 text-center">Could Not Load Alerts</Text>
      <Text className="text-gray-400 text-sm mt-2 text-center">{message}</Text>
      <TouchableOpacity onPress={onRetry} className="mt-6 bg-[#455A64] px-8 py-3 rounded-2xl" activeOpacity={0.8}>
        <Text className="text-white font-bold text-sm">Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AlertsScreen() {
  const { t } = useTranslation();
  const {
    alerts, stats, activeFilter, setFilter,
    loading, refreshing, error, refresh,
    isMuted, toggleMute,
  } = useAlerts();

  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [modalVisible, setModalVisible]   = useState(false);

  const handleCardPress = useCallback((alert: Alert) => {
    // Play sound when user taps an emergency/critical alert
    if (alert.severity === 'emergency' || alert.severity === 'critical') {
      playAlertSound(alert.severity);
    }
    setSelectedAlert(alert);
    setModalVisible(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setModalVisible(false);
    setSelectedAlert(null);
  }, []);

  // Full-screen loader on first load
  if (loading && alerts.length === 0) {
    return (
      <ScreenLayout title={t('alerts_title')} subtitle={t('alerts_subtitle')}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#455A64" />
          <Text className="text-gray-400 text-sm mt-3">Loading alerts…</Text>
        </View>
      </ScreenLayout>
    );
  }

  const hasHighSeverity = stats.emergency + stats.critical > 0;

  return (
    <ScreenLayout title={t('alerts_title')} subtitle={t('alerts_subtitle')}>

      {/* ── Sound status bar ──────────────────────────────────────────────── */}
      <View className="flex-row items-center justify-between mb-3 px-1">
        {/* Live sound indicator */}
        <View className="flex-row items-center gap-2">
          {hasHighSeverity && !isMuted && (
            <Animated.View entering={FadeIn} className="flex-row items-center bg-red-50 border border-red-200 rounded-full px-3 py-1">
              <SoundPulseIcon severity="emergency" />
              <Text className="text-red-600 text-xs font-bold ml-1">LIVE ALERTS</Text>
            </Animated.View>
          )}
          {isMuted && (
            <View className="flex-row items-center bg-gray-100 border border-gray-200 rounded-full px-3 py-1">
              <MaterialCommunityIcons name="volume-off" size={13} color="#9CA3AF" />
              <Text className="text-gray-400 text-xs font-semibold ml-1">Sound Off</Text>
            </View>
          )}
        </View>

        {/* Mute toggle button */}
        <TouchableOpacity
          onPress={toggleMute}
          activeOpacity={0.8}
          className={`flex-row items-center gap-1 px-3 py-2 rounded-full border ${
            isMuted
              ? 'bg-gray-100 border-gray-200'
              : 'bg-[#455A64] border-[#455A64]'
          }`}
        >
          <MaterialCommunityIcons
            name={isMuted ? 'volume-off' : 'volume-high'}
            size={15}
            color={isMuted ? '#9CA3AF' : '#FFFFFF'}
          />
          <Text className={`text-xs font-bold ${isMuted ? 'text-gray-400' : 'text-white'}`}>
            {isMuted ? 'Unmute' : 'Sound On'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Stats badges ──────────────────────────────────────────────────── */}
      <StatsRow
        emergency={stats.emergency}
        critical={stats.critical}
        warning={stats.warning}
        info={stats.info}
      />

      {/* ── Filter chips ──────────────────────────────────────────────────── */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        className="mb-4" contentContainerStyle={{ paddingRight: 8 }}
      >
        {FILTER_CHIPS.map((chip) => {
          const isActive = activeFilter === chip.key;
          const count =
            chip.key === 'all' ? stats.total :
            chip.key === 'emergency' ? stats.emergency :
            chip.key === 'critical'  ? stats.critical  :
            chip.key === 'warning'   ? stats.warning   : stats.info;

          return (
            <TouchableOpacity
              key={chip.key}
              onPress={() => setFilter(chip.key)}
              activeOpacity={0.8}
              style={{
                backgroundColor: isActive ? chip.activeBg : chip.defaultBg,
                paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
                marginRight: 8, flexDirection: 'row', alignItems: 'center',
              }}
            >
              <Text style={{ color: isActive ? '#fff' : '#6B7280', fontWeight: '700', fontSize: 12 }}>
                {chip.label}
              </Text>
              {count > 0 && (
                <View style={{
                  backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.08)',
                  borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, marginLeft: 6,
                }}>
                  <Text style={{ color: isActive ? '#fff' : '#374151', fontSize: 10, fontWeight: '800' }}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Alert list ────────────────────────────────────────────────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} colors={['#455A64']} tintColor="#455A64" />
        }
      >
        {/* Cached data warning */}
        {error && alerts.length > 0 && (
          <View className="bg-red-50 border border-red-200 rounded-2xl p-3 mb-4 flex-row items-center">
            <MaterialCommunityIcons name="wifi-off" size={16} color="#EF4444" />
            <Text className="text-red-500 text-xs font-semibold ml-2 flex-1">
              Could not refresh — showing last known data
            </Text>
            <TouchableOpacity onPress={refresh}>
              <Text className="text-red-600 text-xs font-bold">Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {error && alerts.length === 0 && <ErrorState message={error} onRetry={refresh} />}
        {!error && alerts.length === 0 && <EmptyState filter={activeFilter} />}

        {alerts.map((alert) => (
          <AlertCard key={alert.uuid} alert={alert} onPress={handleCardPress} />
        ))}

        {alerts.length > 0 && (
          <View className="flex-row items-center justify-center pb-2 pt-2">
            <View className="w-2 h-2 rounded-full bg-green-400 mr-2" />
            <Text className="text-gray-300 text-xs font-medium">
              Live · auto-refresh every 30 s · {isMuted ? '🔇 Sound off' : '🔔 Sound on'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ── Detail modal ──────────────────────────────────────────────────── */}
      <AlertDetailModal
        alert={selectedAlert}
        visible={modalVisible}
        onClose={handleModalClose}
        onAcknowledge={(alertId, response) => {
          console.log('Acknowledge', alertId, response);
        }}
      />
    </ScreenLayout>
  );
}
