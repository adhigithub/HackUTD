import { ComingSoon } from '@/components/coming-soon';
import { Screen } from '@/components/ui/screen';

export default function DataScreen() {
  return (
    <Screen edges={['left', 'right']}>
      <ComingSoon
        title="Building data"
        description="Pick a building to see live HVAC, power, temperature, and occupancy, plus its alerts. Data centers also get a Security tab."
      />
    </Screen>
  );
}
