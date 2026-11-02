import React, { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AlertCard } from '@/components/AlertCard';
import { ScreenLayout } from '@/components/ScreenLayout';
import { useTranslation } from 'react-i18next';
import { alertService } from '@/services/alerts/alert.service';
import { pushNotificationService } from '@/services/notifications/pushNotification.service';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { tokenStorage } from '@/services/api/token.storage';
import { API_BASE_URL } from '@env';

type AlertType = 'critical' | 'warning' | 'info' | 'maintenance';

interface AlertItem {
  id: string;
  title: string;
  description: string;
  location: string;
  timestamp: string;
  imageUrl?: string;
  type: AlertType;
}

function mapAlertType(severity: string): AlertType {
  switch (severity?.toLowerCase()) {
    case 'critical':
    case 'emergency':
    case 'danger':
    case 'red':
      return 'critical';
    case 'warning':
    case 'orange':
    case 'yellow':
    case 'medium':
      return 'warning';
    case 'maintenance':
      return 'maintenance';
    default:
      return 'info';
  }
}

function mapApiAlert(item: Record<string, unknown>): AlertItem {
  let location = 'Island-wide';
  if (item.location) {
    location = String(item.location);
  } else if (item.damName) {
    location = `${item.damName} Dam`;
  } else if (item.regionName) {
    location = `${item.regionName} Region`;
  } else if (item.damId) {
    location = `Dam #${item.damId}`;
  } else if (item.regionId) {
    location = `Region #${item.regionId}`;
  }

  const createdAt = item.createdAt ? String(item.createdAt) : '';
  let formattedTime = 'Recent';
  if (createdAt) {
    const d = new Date(createdAt);
    if (!isNaN(d.getTime())) {
      formattedTime = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }

  return {
    id: String(item.id ?? item.uuid ?? item.alertId ?? Math.random()),
    title: String(item.title ?? item.name ?? 'Emergency Alert'),
    description: String(item.description ?? item.message ?? item.content ?? ''),
    location,
    timestamp: formattedTime,
    imageUrl: item.imageUrl ? String(item.imageUrl) : undefined,
    type: mapAlertType(String(item.severity ?? item.type ?? item.alertType ?? '')),
  };
}

export default function AlertsScreen() {
  const { t } = useTranslation();
  const { user, isAdmin: authIsAdmin, role: authRole } = useAuth();

  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [storedRole, setStoredRole] = useState('');

  // ── Admin Broadcast Modal State ──
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastSeverity, setBroadcastSeverity] = useState<'CRITICAL' | 'DANGER' | 'WARNING' | 'INFO'>('CRITICAL');
  const [selectedDamId, setSelectedDamId] = useState<string>('1');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Read role from AsyncStorage to support both storage & context
  useEffect(() => {
    const checkRole = async () => {
      try {
        const r = await AsyncStorage.getItem('userRole');
        setStoredRole(r || '');
      } catch (err) {
        console.log('[ALERTS] Error checking userRole in storage:', err);
      }
    };
    void checkRole();
  }, [user]);

  const effectiveRole = (storedRole || authRole || '').toUpperCase();
  const isAdmin = authIsAdmin || effectiveRole === 'ADMIN' || effectiveRole === 'SUPER_ADMIN';

  const fetchAlerts = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    }
    try {
      let response;
      try {
        response = await alertService.getAll();
      } catch (err) {
        console.log('[ALERTS] /alerts fallback to /active or /feed', err);
        try {
          response = await alertService.getActive();
        } catch {
          response = await alertService.getFeed();
        }
      }

      const raw: Record<string, unknown>[] = Array.isArray(response?.data)
        ? response.data
        : (response?.data?.data ?? response?.data?.content ?? response?.data?.alerts ?? []);

      setAlerts(raw.map(mapApiAlert));
    } catch (err) {
      console.warn('[ALERTS] Failed to load alerts:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    void fetchAlerts();

    // Listen for real-time incoming push notifications and reload feed
    const unsubscribe = pushNotificationService.addNotificationListeners(() => {
      console.log('[ALERTS] Refreshing alerts due to incoming push notification');
      void fetchAlerts();
    });

    return () => {
      unsubscribe();
    };
  }, [fetchAlerts]);

  // Re-fetch when screen is focused + auto poll every 5 seconds
  useFocusEffect(
    useCallback(() => {
      void fetchAlerts();
      const interval = setInterval(() => {
        void fetchAlerts();
      }, 5000);
      return () => clearInterval(interval);
    }, [fetchAlerts])
  );

  // ── Broadcast Alert Action ──
  const handleBroadcast = async () => {
    if (!broadcastTitle.trim()) {
      Alert.alert('Validation Error', 'Please enter an alert title.');
      return;
    }
    if (!broadcastMessage.trim()) {
      Alert.alert('Validation Error', 'Please enter an alert message.');
      return;
    }

    setIsBroadcasting(true);
    try {
      const token = (await AsyncStorage.getItem('token')) || (await tokenStorage.get());

      let apiSeverity = broadcastSeverity.toLowerCase();
      if (apiSeverity === 'danger') {
        apiSeverity = 'emergency';
      }

      const newAlert = {
        alertTypeId: 1,
        title: broadcastTitle.trim(),
        message: broadcastMessage.trim(),
        severity: apiSeverity,
        status: 'active',
        damId: selectedDamId ? Number(selectedDamId) : undefined,
      };

      // 1. Primary: via alertService.create
      try {
        await alertService.create(newAlert);
      } catch (serviceErr) {
        console.warn('[ALERTS] alertService.create fallback to fetch:', serviceErr);
        // Fallback: direct fetch using apiUrl
        const response = await fetch(`${API_BASE_URL}/alerts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(newAlert),
        });

        if (!response.ok) {
          throw new Error(`Failed to broadcast: HTTP ${response.status}`);
        }
      }

      Alert.alert('✅ Broadcast Sent', 'Notification Broadcasted Successfully to all mobile devices and SMS!');
      setShowBroadcastModal(false);
      setBroadcastTitle('');
      setBroadcastMessage('');
      void fetchAlerts(true);
    } catch (error: any) {
      console.error('Error broadcasting alert:', error);
      Alert.alert('Broadcast Error', error?.response?.data?.message || error?.message || 'Failed to broadcast alert.');
    } finally {
      setIsBroadcasting(false);
    }
  };

  const criticalCount = alerts.filter((a) => a.type === 'critical').length;
  const warningCount = alerts.filter((a) => a.type === 'warning').length;
  const updatesCount = alerts.filter((a) => a.type === 'info' || a.type === 'maintenance').length;

  return (
    <ScreenLayout
      title={t('alerts_title', 'DDAS Alerts')}
      subtitle={t('alerts_subtitle', 'Live Emergency & Flood Notifications')}
    >
      <View className="flex-1 relative">
        {/* ── Summary Badges ── */}
        <View className="flex-row px-1 mb-6 mt-2">
          <View className="bg-red-50 border border-red-100 flex-1 rounded-2xl p-3 mr-2 items-center shadow-sm">
            <Text className="text-red-600 font-bold text-lg">{criticalCount}</Text>
            <Text className="text-red-500 text-[10px] uppercase font-bold tracking-wider">Critical</Text>
          </View>
          <View className="bg-amber-50 border border-amber-100 flex-1 rounded-2xl p-3 mr-2 items-center shadow-sm">
            <Text className="text-amber-600 font-bold text-lg">{warningCount}</Text>
            <Text className="text-amber-500 text-[10px] uppercase font-bold tracking-wider">Warnings</Text>
          </View>
          <View className="bg-blue-50 border border-blue-100 flex-1 rounded-2xl p-3 items-center shadow-sm">
            <Text className="text-blue-600 font-bold text-lg">{updatesCount}</Text>
            <Text className="text-blue-500 text-[10px] uppercase font-bold tracking-wider">Updates</Text>
          </View>
        </View>

        {/* ── Content / List ── */}
        {loading ? (
          <View className="flex-1 justify-center items-center py-20">
            <ActivityIndicator size="large" color="#4f46e5" />
            <Text className="text-gray-400 text-xs mt-3 font-medium">Fetching active alerts…</Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 90 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void fetchAlerts(true)}
                tintColor="#4f46e5"
                colors={['#4f46e5']}
              />
            }
          >
            {alerts.length > 0 ? (
              alerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  title={alert.title}
                  description={alert.description}
                  location={alert.location}
                  timestamp={alert.timestamp}
                  imageUrl={alert.imageUrl}
                  type={alert.type}
                />
              ))
            ) : (
              <View className="bg-white rounded-3xl p-8 items-center justify-center my-6 border border-gray-100 shadow-sm">
                <Text className="text-4xl mb-3">🛡️</Text>
                <Text className="text-gray-800 font-bold text-base mb-1">No Active Emergencies</Text>
                <Text className="text-gray-500 text-xs text-center leading-5 mb-5 px-4">
                  All dams and catchment regions are operating under safe parameters. You will receive an instant notification if an alert is dispatched.
                </Text>
                <TouchableOpacity
                  onPress={() => void fetchAlerts(true)}
                  className="bg-indigo-50 border border-indigo-200 px-5 py-2.5 rounded-xl active:bg-indigo-100"
                >
                  <Text className="text-indigo-600 font-semibold text-xs">🔄 Refresh Feed</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )}

        {/* ── Admin-Only Floating Broadcast Button (FAB) ── */}
        {isAdmin && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setShowBroadcastModal(true)}
            className="absolute bottom-6 right-2 bg-red-600 px-5 py-3.5 rounded-full shadow-2xl flex-row items-center border border-red-500 z-50 elevation-5"
            style={{
              shadowColor: '#dc2626',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.45,
              shadowRadius: 8,
              elevation: 8,
            }}
          >
            <Text className="text-white text-base mr-1.5">🚨</Text>
            <Text className="text-white font-bold text-sm tracking-wide">+ Broadcast</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Admin Emergency Alert Modal ── */}
      <Modal
        visible={showBroadcastModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowBroadcastModal(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View className="flex-1 bg-black/50 justify-end">
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              className="bg-white rounded-t-[32px] p-6 max-h-[88%]"
            >
              {/* Modal Header */}
              <View className="flex-row items-center justify-between pb-3 border-b border-gray-100 mb-4">
                <View className="flex-row items-center gap-2">
                  <Text className="text-2xl">🚨</Text>
                  <View>
                    <Text className="text-lg font-bold text-gray-900">Broadcast Emergency Alert</Text>
                    <Text className="text-xs text-gray-500">Dispatch instant notification to mobile app & SMS</Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setShowBroadcastModal(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
                >
                  <Text className="text-gray-500 font-bold text-base">✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} className="space-y-4">
                {/* Target Dam Selection */}
                <View className="mb-3">
                  <Text className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Target Dam / Location *</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {[
                      { id: '1', name: 'Victoria Dam' },
                      { id: '2', name: 'Kotmale Dam' },
                      { id: '3', name: 'Randenigala Dam' },
                      { id: '', name: '🌐 Island-wide' },
                    ].map((d) => (
                      <TouchableOpacity
                        key={d.id}
                        onPress={() => setSelectedDamId(d.id)}
                        className={`px-3 py-2 rounded-xl border ${
                          selectedDamId === d.id
                            ? 'bg-indigo-50 border-indigo-600'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <Text
                          className={`text-xs font-semibold ${
                            selectedDamId === d.id ? 'text-indigo-700' : 'text-gray-700'
                          }`}
                        >
                          {d.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Severity Selection */}
                <View className="mb-3">
                  <Text className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Severity Level *</Text>
                  <View className="flex-row gap-2">
                    {(['CRITICAL', 'DANGER', 'WARNING', 'INFO'] as const).map((sev) => {
                      const isSelected = broadcastSeverity === sev;
                      const sevColors: Record<string, { bg: string; border: string; text: string }> = {
                        CRITICAL: { bg: 'bg-red-50', border: 'border-red-600', text: 'text-red-700' },
                        DANGER: { bg: 'bg-orange-50', border: 'border-orange-600', text: 'text-orange-700' },
                        WARNING: { bg: 'bg-amber-50', border: 'border-amber-600', text: 'text-amber-700' },
                        INFO: { bg: 'bg-blue-50', border: 'border-blue-600', text: 'text-blue-700' },
                      };
                      const conf = sevColors[sev];
                      return (
                        <TouchableOpacity
                          key={sev}
                          onPress={() => setBroadcastSeverity(sev)}
                          className={`flex-1 py-2.5 rounded-xl items-center border ${
                            isSelected ? `${conf.bg} ${conf.border} border-2` : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <Text
                            className={`text-[11px] font-bold ${
                              isSelected ? conf.text : 'text-gray-600'
                            }`}
                          >
                            {sev}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Alert Title Input */}
                <View className="mb-3">
                  <Text className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Alert Title *</Text>
                  <TextInput
                    placeholder="e.g. Spill Gates Opening — Victoria Dam"
                    placeholderTextColor="#9ca3af"
                    value={broadcastTitle}
                    onChangeText={setBroadcastTitle}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 font-medium"
                  />
                </View>

                {/* Alert Message Input */}
                <View className="mb-4">
                  <Text className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Alert Message *</Text>
                  <TextInput
                    placeholder="Provide emergency instructions (e.g. කරුණාකර වහාම ආරක්ෂිත ස්ථාන වෙත යන්න)..."
                    placeholderTextColor="#9ca3af"
                    value={broadcastMessage}
                    onChangeText={setBroadcastMessage}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 font-medium min-h-[80px]"
                  />
                </View>

                {/* Action Buttons */}
                <View className="flex-row gap-3 pt-2 pb-6">
                  <TouchableOpacity
                    onPress={() => setShowBroadcastModal(false)}
                    className="flex-1 py-3.5 rounded-xl border border-gray-200 items-center justify-center bg-gray-50"
                  >
                    <Text className="text-sm font-semibold text-gray-600">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleBroadcast}
                    disabled={isBroadcasting}
                    className="flex-2 py-3.5 rounded-xl bg-red-600 items-center justify-center shadow-lg shadow-red-500/30 flex-row gap-2 active:bg-red-700 disabled:opacity-60"
                  >
                    {isBroadcasting ? (
                      <>
                        <ActivityIndicator size="small" color="#ffffff" />
                        <Text className="text-white font-bold text-sm">Broadcasting…</Text>
                      </>
                    ) : (
                      <>
                        <Text className="text-base">🚨</Text>
                        <Text className="text-white font-bold text-sm">Broadcast Emergency Alert</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </ScreenLayout>
  );
}
