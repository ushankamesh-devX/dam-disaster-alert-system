import React from 'react';
import { ScrollView, View, Text } from 'react-native';
import { AlertCard } from '@/components/AlertCard';
import { ScreenLayout } from '@/components/ScreenLayout';
import { useTranslation } from 'react-i18next';

export default function AlertsScreen() {
  const { t } = useTranslation();
  const alerts: Array<{ id: string; title: string; description: string; location: string; timestamp: string; imageUrl?: string; type: 'critical' | 'warning' | 'info' | 'maintenance' }> = [
    {
      id: '1',
      title: 'EVACUATION ORDER',
      description: 'IMMEDIATE ACTION REQUIRED: Reservoir levels have exceeded safety limits. Residents in low-lying areas must move to higher ground immediately.',
      location: 'Mullaperiyar Danger Zone',
      timestamp: '2 mins ago',
      type: 'critical'
    },
    {
      id: '2',
      title: 'SPILLWAY ALERT',
      description: 'The spillway gates are scheduled to open by 10.00 PM tonight. Expect a 2-meter rise in downstream river levels.',
      location: 'Idukki Reservoir Downstream',
      timestamp: '15 mins ago',
      type: 'warning'
    },
    {
      id: '3',
      title: 'WEATHER ADVISORY',
      description: 'Heavy rainfall forecasted for the next 48 hours in the catchment area. Water levels are being monitored closely.',
      location: 'Western Ghats Catchment',
      timestamp: '1 hour ago',
      type: 'info'
    },
    {
      id: '4',
      title: 'SYSTEM MAINTENANCE',
      description: 'Scheduled maintenance of Level Sensor #042 will occur tomorrow between 02:00 AM and 04:00 AM. Real-time monitoring may be intermittent.',
      location: 'Sensor Station C-12',
      timestamp: '3 hours ago',
      type: 'maintenance'
    },
    {
      id: '5',
      title: 'CRITICAL WARNING',
      description: 'Abnormal vibration detected in Section B-7. Engineering teams are on-site for emergency inspection. Stay clear of the embankment.',
      location: 'Main Dam Embankment',
      timestamp: '5 minutes ago',
      type: 'critical',
      imageUrl: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=800&q=80',
    },
  ];

  return (
    <ScreenLayout
      title={t('alerts_title')}
      subtitle={t('alerts_subtitle')}
    >
      <View className="flex-row px-1 mb-6 mt-2">
        <View className="bg-red-50 border border-red-100 flex-1 rounded-2xl p-3 mr-2 items-center shadow-sm">
          <Text className="text-red-600 font-bold text-lg">2</Text>
          <Text className="text-red-500 text-[10px] uppercase font-bold">Critical</Text>
        </View>
        <View className="bg-amber-50 border border-amber-100 flex-1 rounded-2xl p-3 mr-2 items-center shadow-sm">
          <Text className="text-amber-600 font-bold text-lg">1</Text>
          <Text className="text-amber-500 text-[10px] uppercase font-bold">Warnings</Text>
        </View>
        <View className="bg-blue-50 border border-blue-100 flex-1 rounded-2xl p-3 items-center shadow-sm">
          <Text className="text-blue-600 font-bold text-lg">2</Text>
          <Text className="text-blue-500 text-[10px] uppercase font-bold">Updates</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {alerts.map((alert) => (
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
    </ScreenLayout>
  );
}
