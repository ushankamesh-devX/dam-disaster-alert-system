import { ScreenLayout } from '@/components/ScreenLayout';
import { EmergencySafeLocationFlow } from '@/components/Emergency Contact/EmergencySafeLocationFlow';
import { useTranslation } from 'react-i18next';

export default function EmergencyScreen() {
  const { t } = useTranslation();
  return (
    <ScreenLayout
      title={t('safe_locations_title')}
      subtitle={t('safe_locations_subtitle')}
    >
      <EmergencySafeLocationFlow />
    </ScreenLayout>
  );
}
