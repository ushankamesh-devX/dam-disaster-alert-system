import { ScreenLayout } from '@/components/ScreenLayout';
import { SafeLocations } from '@/components/Emergency Contact/SafeLocations';

const mapImage = require('../../assets/images/Emergency Contact/Google map.png');

export default function EmergencyScreen() {
  return (
    <ScreenLayout 
      title="Safe Locations" 
      subtitle="Quick access to emergency contacts"
    >
      <SafeLocations mapImageSource={mapImage} />
    </ScreenLayout>
  );
}
