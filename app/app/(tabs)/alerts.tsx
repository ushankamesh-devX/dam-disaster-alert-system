import React from 'react';
import { ScrollView, View } from 'react-native';
import { AlertCard } from '@/components/AlertCard';
import { ScreenLayout } from '@/components/ScreenLayout';
import { useTranslation } from 'react-i18next';

export default function AlertsScreen() {
  const { t } = useTranslation();
  const alerts = [
    {
      id: '1',
      title: 'CRITICAL WARNING',
      description: 'Water level is nearing to a high threshold. Prepare for evacuation.',
      location: 'Mullaperiyar',
      timestamp: '5 minutes ago',
    },
    {
      id: '2',
      title: 'CRITICAL WARNING',
      description: 'Water level is nearing to a high threshold. Prepare for evacuation.',
      location: 'Mullaperiyar',
      timestamp: '5 minutes ago',
    },
    {
      id: '3',
      title: 'CRITICAL WARNING',
      description: 'Water level is nearing to a high threshold. Prepare for evacuation.',
      location: 'Mullaperiyar',
      timestamp: '5 minutes ago',
    },
    {
      id: '4',
      title: 'CRITICAL WARNING',
      description: 'Water level is nearing to a high threshold. Prepare for evacuation.',
      location: 'Mullaperiyar',
      timestamp: '5 minutes ago',
      imageUrl: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=800&q=80',
    },
    {
      id: '5',
      title: 'CRITICAL WARNING',
      description: 'Water level is nearing to a high threshold. Prepare for evacuation.',
      location: 'Mullaperiyar',
      timestamp: '5 minutes ago',
    },
  ];

  return (
    <ScreenLayout
      title={t('alerts_title')}
      subtitle={t('alerts_subtitle')}
    >
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
          />
        ))}
      </ScrollView>
    </ScreenLayout>
  );
}
