import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import { formatMoney, formatTimeAgo, type Building, type SecurityEvent } from '@/data/buildings';
import { useTheme } from '@/hooks/use-theme';

import { SeverityPill } from './severity-pill';

type Security = NonNullable<Building['security']>;

/**
 * Security view for data centers (NMC² challenge).
 * Linked risks go first — a physical + cyber event together is the scariest case.
 */
export function SecurityPanel({ security }: { security: Security }) {
  const theme = useTheme();
  const physical = security.events.filter((e) => e.kind === 'physical');
  const cyber = security.events.filter((e) => e.kind === 'cyber');

  return (
    <View style={styles.container}>
      {security.linkedRisks.length > 0 && (
        <View style={styles.section}>
          <ThemedText type="subtitle">Warning signs that add up</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Each of these looks small on its own. Together, they could mean someone broke in.
          </ThemedText>

          {security.linkedRisks.map((risk) => {
            const events = risk.eventIds
              .map((id) => security.events.find((e) => e.id === id))
              .filter((e): e is SecurityEvent => !!e);

            return (
              <Card
                key={risk.id}
                style={{ borderColor: theme.danger, backgroundColor: theme.dangerSoft }}>
                <ThemedText type="smallBold">{risk.title}</ThemedText>

                {events.map((e, i) => (
                  <ThemedText key={e.id} type="small" themeColor="textSecondary">
                    {i + 1}. {e.title} ({e.kind === 'cyber' ? 'on the computer network' : 'in the building'})
                  </ThemedText>
                ))}

                <ThemedText type="smallBold" themeColor="danger">
                  Could cost {formatMoney(risk.costAtRisk)} if it’s real
                </ThemedText>

                <ThemedText type="smallBold" style={styles.fixHeading}>
                  What to do
                </ThemedText>
                {risk.fixSteps.map((step) => (
                  <ThemedText key={step} type="small">
                    • {step}
                  </ThemedText>
                ))}
              </Card>
            );
          })}
        </View>
      )}

      <EventSection title="In the building" events={physical} />
      <EventSection title="On the computer network" events={cyber} />
    </View>
  );
}

function EventSection({ title, events }: { title: string; events: SecurityEvent[] }) {
  return (
    <View style={styles.section}>
      <ThemedText type="subtitle">{title}</ThemedText>
      {events.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          Nothing unusual.
        </ThemedText>
      ) : (
        events.map((e) => (
          <Card key={e.id}>
            <View style={styles.topRow}>
              <SeverityPill severity={e.severity} />
              <ThemedText type="small" themeColor="textSecondary">
                {formatTimeAgo(e.at)}
              </ThemedText>
            </View>
            <ThemedText type="smallBold">{e.title}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {e.detail}
            </ThemedText>
          </Card>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.four },
  section: { gap: Spacing.two },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fixHeading: { marginTop: Spacing.one },
});
