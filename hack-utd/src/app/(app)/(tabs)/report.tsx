import { ComingSoon } from '@/components/coming-soon';
import { Screen } from '@/components/ui/screen';

export default function ReportScreen() {
  return (
    <Screen edges={['left', 'right']}>
      <ComingSoon
        title="Client report"
        description="Savings, prevented outages, and an Ask AI panel for questions about the portfolio."
      />
    </Screen>
  );
}
