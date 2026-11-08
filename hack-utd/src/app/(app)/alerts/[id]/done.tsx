import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAlerts } from '@/features/alerts/alerts-context';
import { formatUSD } from '@/features/alerts/format';
import { listUsers } from '@/lib/auth/user-store';

export default function FixDoneScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { getAlert, resolutions } = useAlerts();
  const alert = getAlert(id);
  const resolution = resolutions[id];
  const fix = alert?.fixes.find((f) => f.id === resolution?.fixId);

  // Put a real name on "Technician on duty" from the team list.
  const [technician, setTechnician] = useState<string | null>(null);
  useEffect(() => {
    listUsers().then((users) => setTechnician(users.find((u) => u.role === 'technician')?.name ?? null));
  }, []);

  const goHome = () => router.dismissTo('/home');

  if (!alert || !resolution || !fix) {
    return (
      <Screen edges={['left', 'right', 'bottom']}>
        <Button title="Back to Home" onPress={goHome} />
      </Screen>
    );
  }

  const notified = resolution.notified
    .map((n) => (n === 'Technician on duty' && technician ? technician : n))
    .join(', ');

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <View style={styles.center}>
        <View style={[styles.check, { backgroundColor: theme.successSoft }]}>
          <ThemedText style={[styles.checkMark, { color: theme.success }]}>✓</ThemedText>
        </View>
        <ThemedText style={[styles.saved, { color: theme.success }]}>
          {formatUSD(resolution.saved)} saved
        </ThemedText>
        <ThemedText style={styles.text}>{fix.title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.text}>
          Notified: {notified}
        </ThemedText>
      </View>
      <Button title="Back to Home" onPress={goHome} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: Spacing.two, marginVertical: Spacing.five },
  check: {
    width: 72,
    height: 72,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { fontSize: 36, lineHeight: 42, fontWeight: 800 },
  saved: { fontSize: 32, lineHeight: 40, fontWeight: 800 },
  text: { textAlign: 'center' },
});
