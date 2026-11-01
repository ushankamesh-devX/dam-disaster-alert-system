import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ScreenLayout } from '@/components/ScreenLayout';
import { EmergencySafeLocationFlow } from '@/components/Emergency Contact/EmergencySafeLocationFlow';
import { EvacuationFlow } from '@/components/evacuation/EvacuationFlow';
import { useTranslation } from 'react-i18next';

export default function EmergencyScreen() {
  const { t } = useTranslation();
  const [view, setView] = useState<'evacuate' | 'places'>('evacuate');
  return (
    <ScreenLayout title={t('emergency_title', 'Emergency')} subtitle={t('emergency_subtitle', 'Evacuation, SOS and safe places')}>
      <View style={{ flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 12, padding: 3, marginBottom: 12 }}>
        {([['evacuate', 'Evacuate & SOS'], ['places', 'Safe places & contacts']] as const).map(([k, label]) => (
          <Pressable key={k} onPress={() => setView(k)}
            style={{ flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center', backgroundColor: view === k ? '#455A64' : 'transparent' }}>
            <Text style={{ fontWeight: '700', fontSize: 13, color: view === k ? '#fff' : '#374151' }}>{label}</Text>
          </Pressable>
        ))}
      </View>
      {view === 'evacuate' ? <EvacuationFlow /> : <EmergencySafeLocationFlow />}
    </ScreenLayout>
  );
}
