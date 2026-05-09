import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { AlertCard } from '@/components/AlertCard';
import { ScreenLayout } from '@/components/ScreenLayout';
import { useTranslation } from 'react-i18next';
import { alertService } from '@/services/alerts/alert.service';

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
    case 'red':
      return 'critical';
    case 'warning':
    case 'orange':
    case 'yellow':
      return 'warning';
    case 'maintenance':
      return 'maintenance';
    default:
      return 'info';
  }
}

function mapApiAlert(item: Record<string, unknown>): AlertItem {
  return {
    id: String(item.id ?? item.alertId ?? ''),
    title: String(item.title ?? item.name ?? ''),
    description: String(item.description ?? item.message ?? item.content ?? ''),
    location: String(item.location ?? item.damName ?? item.area ?? ''),
    timestamp: item.createdAt
      ? new Date(String(item.createdAt)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '',
    imageUrl: item.imageUrl ? String(item.imageUrl) : undefined,
    type: mapAlertType(String(item.severity ?? item.type ?? item.alertType ?? '')),
  };
}

export default function AlertsScreen() {
  const { t } = useTranslation();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'critical' | 'warning' | 'updates'>('all');

  const fetchAlerts = () =>
    alertService
      .getActive()
      .then((res) => {
        const raw: Record<string, unknown>[] = Array.isArray(res.data)
          ? res.data
          : (res.data?.data ?? res.data?.content ?? res.data?.alerts ?? []);
        setAlerts(raw.map(mapApiAlert));
      })
      .catch(() => setAlerts([]));

  useEffect(() => {
    fetchAlerts()
      .finally(() => setLoading(false));
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAlerts()
      .finally(() => setRefreshing(false));
  };

  const criticalCount = alerts.filter((a) => a.type === 'critical').length;
  const warningCount = alerts.filter((a) => a.type === 'warning').length;
  const updatesCount = alerts.filter((a) => a.type === 'info' || a.type === 'maintenance').length;

  const filteredAlerts = alerts.filter((a) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'updates') return a.type === 'info' || a.type === 'maintenance';
    return a.type === activeFilter;
  });

  return (
    <ScreenLayout
      title={t('alerts_title')}
      subtitle={t('alerts_subtitle')}
    >
      <View className="flex-row px-1 mb-6 mt-2">
        <View className="bg-red-50 border border-red-100 flex-1 rounded-2xl p-3 mr-2 items-center shadow-sm">
          <Text className="text-red-600 font-bold text-lg">{criticalCount}</Text>
          <Text className="text-red-500 text-[10px] uppercase font-bold">Critical</Text>
        </View>
        <View className="bg-amber-50 border border-amber-100 flex-1 rounded-2xl p-3 mr-2 items-center shadow-sm">
          <Text className="text-amber-600 font-bold text-lg">{warningCount}</Text>
          <Text className="text-amber-500 text-[10px] uppercase font-bold">Warnings</Text>
        </View>
        <View className="bg-blue-50 border border-blue-100 flex-1 rounded-2xl p-3 items-center shadow-sm">
          <Text className="text-blue-600 font-bold text-lg">{updatesCount}</Text>
          <Text className="text-blue-500 text-[10px] uppercase font-bold">Updates</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View className="flex-row px-1 mb-4">
        {([
          { id: 'all', label: 'All' },
          { id: 'critical', label: 'Critical' },
          { id: 'warning', label: 'Warnings' },
          { id: 'updates', label: 'Updates' },
        ] as const).map((filter) => (
          <TouchableOpacity
            key={filter.id}
            onPress={() => setActiveFilter(filter.id)}
            className={`mr-2 px-3 py-1.5 rounded-full border ${activeFilter === filter.id
              ? 'bg-blue-600 border-blue-600'
              : 'bg-white border-gray-200'
            }`}
          >
            <Text className={`${activeFilter === filter.id ? 'text-white' : 'text-gray-600'} text-xs font-semibold`}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" className="mt-10" />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#2563eb"
            />
          }
        >
          {filteredAlerts.length === 0 && (
            <View className="items-center mt-8">
              <Text className="text-gray-400 text-sm">No notifications</Text>
            </View>
          )}
          {filteredAlerts.map((alert) => (
            <AlertCard
              key={alert.id}
              title={alert.title}
              description={alert.description}
              location={alert.location}
              timestamp={alert.timestamp}
              imageUrl={alert.imageUrl}
              type={alert.type}
            />
          ))}
        </ScrollView>
      )}
    </ScreenLayout>
  );
}
