import { ScreenLayout } from '@/components/ScreenLayout';
import { SafeLocations } from '@/components/Emergency Contact/SafeLocations';

export default function EmergencyScreen() {
  return (
    <ScreenLayout 
      title="Safe Locations" 
      subtitle="Quick access to emergency contacts"
    >
      <SafeLocations />
    </ScreenLayout>
  );
}
