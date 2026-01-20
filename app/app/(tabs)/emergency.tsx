import { ScreenLayout } from '@/components/ScreenLayout';
import { EmergencySafeLocationFlow } from '@/components/Emergency Contact/EmergencySafeLocationFlow';

export default function EmergencyScreen() {
  return (
    <ScreenLayout 
      title="Safe Locations" 
      subtitle="Quick access to emergency contacts"
    >
      <EmergencySafeLocationFlow />
    </ScreenLayout>
  );
}
