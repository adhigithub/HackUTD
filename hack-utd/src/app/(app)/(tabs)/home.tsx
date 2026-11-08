import { ActivityIndicator, RefreshControl, StyleSheet, View } from 'react-native';

import { AlertCard } from '@/components/alerts/alert-card';
import { AutoFixCard } from '@/components/alerts/auto-fix-card';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAlerts } from '@/features/alerts/alerts-context';
import { formatClock, formatUSD } from '@/features/alerts/format';
import { useAuth } from '@/lib/auth/auth-context';
import { can } from '@/lib/auth/types';

export default function HomeScreen() {
  const { user } = useAuth();
  const theme = useTheme();
  const {
    status,
    scannedAt,
    dataSource,
    alerts,
    openAlerts,
    resolutions,
    totalAtRisk,
    savedThisMonth,
    autoFixes,
    rescan,
    setAutoFixUndone,
  } = useAlerts();
  if (!user) return null; // briefly null while signing out

  const firstLoad = status === 'scanning' && scannedAt === null;
  const fixed = alerts.filter((a) => resolutions[a.id]);

  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={status === 'scanning' && !firstLoad} onRefresh={rescan} />
      }>
      <ThemedText type="title" style={styles.greeting}>
        Hi, {user.name.split(' ')[0]}
      </ThemedText>

      {/* The one number that matters */}
      <Card style={[styles.hero, { backgroundColor: theme.primary, borderColor: theme.primary }]}>
        <ThemedText type="small" style={{ color: theme.primaryText }}>
          Money at risk right now
        </ThemedText>
        {firstLoad ? (
          <ActivityIndicator color={theme.primaryText} style={styles.heroLoading} />
        ) : (
          <ThemedText style={[styles.heroValue, { color: theme.primaryText }]}>
            {formatUSD(totalAtRisk)}
          </ThemedText>
        )}
        <ThemedText type="small" style={{ color: theme.primaryText, opacity: 0.85 }}>
          {formatUSD(savedThisMonth)} saved this month
        </ThemedText>
      </Card>

      {status === 'error' && (
        <Card>
          <ThemedText>Couldn’t scan your buildings.</ThemedText>
          <Button title="Try again" variant="secondary" onPress={rescan} />
        </Card>
      )}

      {/* Alerts, biggest $ first */}
      <View style={styles.section}>
        <ThemedText type="subtitle">Needs attention</ThemedText>
        {scannedAt !== null && (
          <ThemedText type="small" themeColor={dataSource === 'live' ? 'success' : 'textSecondary'}>
            {dataSource === 'live'
              ? `● Live building data · updated ${formatClock(scannedAt)}`
              : 'Demo data (live backend not connected)'}
          </ThemedText>
        )}
        {firstLoad ? (
          <ActivityIndicator style={styles.loading} />
        ) : openAlerts.length === 0 ? (
          <ThemedText themeColor="textSecondary">All clear. Nothing is at risk.</ThemedText>
        ) : (
          openAlerts.map((a) => <AlertCard key={a.id} alert={a} />)
        )}
      </View>

      <AutoFixCard
        fixes={autoFixes}
        canUndo={can(user, 'approveFixes')}
        onSetUndone={setAutoFixUndone}
      />

      {fixed.length > 0 && (
        <View style={styles.section}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            FIXED TODAY
          </ThemedText>
          {fixed.map((a) => (
            <AlertCard key={a.id} alert={a} resolution={resolutions[a.id]} />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  greeting: { marginTop: Spacing.two },
  hero: { padding: Spacing.four, gap: Spacing.one },
  heroValue: { fontSize: 40, lineHeight: 48, fontWeight: 800 },
  heroLoading: { alignSelf: 'flex-start', marginVertical: Spacing.three },
  section: { gap: Spacing.three },
  loading: { padding: Spacing.four },
});
