import { useMemo, useState, type ReactNode } from 'react';
import { Share, StyleSheet, View } from 'react-native';

import { AskAiCard } from '@/components/report/ask-ai-card';
import { BarList } from '@/components/report/bar-list';
import { IncidentCard, Pill } from '@/components/report/incident-card';
import { SegmentedControl } from '@/components/report/segmented-control';
import { StatTile } from '@/components/report/stat-tile';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth/auth-context';
import { can } from '@/lib/auth/types';
import { formatNumber, formatShortDate, formatUSD, formatUSDCompact, plural } from '@/lib/portfolio/format';
import { buildReport, buildingName, reportAsText, type ReportPeriod } from '@/lib/portfolio/report';
import { BUILDING_TYPE_LABELS, CATEGORY_LABELS } from '@/lib/portfolio/types';

const PERIOD_OPTIONS: { value: ReportPeriod; label: string }[] = [
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
];

export default function ReportScreen() {
  const { user } = useAuth();
  const theme = useTheme();
  const [period, setPeriod] = useState<ReportPeriod>(30);
  const [shareError, setShareError] = useState<string | null>(null);
  const report = useMemo(() => buildReport(period), [period]);

  if (!user) return null;

  if (!can(user, 'viewReports')) {
    return (
      <Screen edges={['left', 'right']}>
        <Card style={styles.locked}>
          <ThemedText type="subtitle">Client report</ThemedText>
          <ThemedText themeColor="textSecondary">
            Client reports and Ask AI are available to Managers and CBRE Advisors. Ask a manager if you
            need access.
          </ThemedText>
        </Card>
      </Screen>
    );
  }

  async function share() {
    setShareError(null);
    try {
      await Share.share({ title: 'BluePrint client report', message: reportAsText(report) });
    } catch {
      setShareError('Sharing isn’t available on this device.');
    }
  }

  return (
    <Screen edges={['left', 'right']}>
      <View style={styles.header}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          CLIENT REPORT · {formatShortDate(report.startISO).toUpperCase()} – {formatShortDate(report.endISO).toUpperCase()}
        </ThemedText>
        <ThemedText type="title">Portfolio impact</ThemedText>
      </View>

      <SegmentedControl
        accessibilityLabel="Report period"
        options={PERIOD_OPTIONS}
        value={period}
        onChange={setPeriod}
      />

      {/* Headline: the number the client cares about. */}
      <Card style={styles.hero}>
        <ThemedText type="small" themeColor="textSecondary">
          Money saved
        </ThemedText>
        <ThemedText style={[styles.heroValue, { color: theme.success }]}>{formatUSD(report.totalSaved)}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {formatUSD(report.incidentSavings)} from {plural(report.incidents.length, 'problem')} stopped before they spread,
          plus {formatUSD(report.wasteSaved)} in overnight waste cut automatically.
        </ThemedText>
      </Card>

      <View style={styles.grid}>
        <StatTile label="Outages prevented" value={String(report.outagesPrevented)} />
        <StatTile label="Failures caught early" value={String(report.failuresPrevented)} />
        <StatTile label="Security threats stopped" value={String(report.threatsStopped)} />
        <StatTile
          label="Auto-fixed overnight"
          value={String(report.wasteNights)}
          detail={`≈ ${formatUSDCompact(report.wasteAnnualized)}/yr`}
        />
      </View>

      <AskAiCard role={user.role} period={period} />

      <Section title="Savings by building">
        <Card>
          <BarList
            items={report.byBuilding.map((b) => ({
              key: b.building.id,
              label: b.building.name,
              sublabel: `${BUILDING_TYPE_LABELS[b.building.type]} · ${b.incidents} ${b.incidents === 1 ? 'problem' : 'problems'} stopped`,
              value: b.saved,
              valueLabel: formatUSD(b.saved),
            }))}
          />
          <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
            The same problem costs more at a data center: 10 minutes without power is minor at a mall and a
            disaster when a lease promises 99.99% uptime.
          </ThemedText>
        </Card>
      </Section>

      <Section title="Savings by issue type">
        <Card>
          <BarList
            items={report.byCategory.map((c) => ({
              key: c.category,
              label: CATEGORY_LABELS[c.category],
              value: c.saved,
              valueLabel: formatUSD(c.saved),
            }))}
          />
        </Card>
      </Section>

      <Section title={`At risk right now · ${formatUSD(report.moneyAtRisk)}`}>
        <Card style={styles.list}>
          {report.activeAlerts.map((a, i) => (
            <View
              key={a.id}
              style={[styles.alert, i > 0 && { borderTopWidth: 1, borderTopColor: theme.border }]}>
              <View style={styles.alertTop}>
                <Pill
                  label={a.severity === 'act' ? 'Act now' : 'Watch'}
                  fg={a.severity === 'act' ? 'danger' : 'warning'}
                  bg={a.severity === 'act' ? 'dangerSoft' : 'warningSoft'}
                />
                <ThemedText type="small" themeColor="textSecondary" style={styles.flex} numberOfLines={1}>
                  {buildingName(a.buildingId)}
                </ThemedText>
                <ThemedText type="smallBold" style={styles.num}>
                  {formatUSD(a.moneyAtRisk)}
                </ThemedText>
              </View>
              <ThemedText type="smallBold">{a.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Gets worse {a.eta}. {a.recommendedFix}
              </ThemedText>
            </View>
          ))}
        </Card>
      </Section>

      <Section title="Stopped before it spread">
        {report.incidents.length ? (
          report.incidents.map((i) => <IncidentCard key={i.id} incident={i} />)
        ) : (
          <Card>
            <ThemedText themeColor="textSecondary">No problems needed stopping in this period.</ThemedText>
          </Card>
        )}
      </Section>

      <Section title="Overnight waste cut">
        <Card style={styles.list}>
          {report.wasteByZone.map((z, i) => (
            <View
              key={`${z.building.id}-${z.zone}`}
              style={[styles.wasteRow, i > 0 && { borderTopWidth: 1, borderTopColor: theme.border }]}>
              <View style={styles.flex}>
                <ThemedText type="smallBold">
                  {z.building.name} · {z.zone}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {plural(z.nights, 'night')} · {formatNumber(z.kwh)} kWh
                </ThemedText>
              </View>
              <ThemedText type="smallBold" style={styles.num}>
                {formatUSD(z.saved)}
              </ThemedText>
            </View>
          ))}
          <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
            Runs only when HVAC is on, nobody is badged in, and it’s outside lease hours. Switches back on the
            next badge swipe.
          </ThemedText>
        </Card>
      </Section>

      <Button title="Share report" variant="secondary" onPress={share} />
      {shareError ? (
        <ThemedText type="small" themeColor="danger">
          {shareError}
        </ThemedText>
      ) : null}

      <ThemedText type="small" themeColor="textSecondary" style={styles.footnote}>
        Dollar figures are illustrative estimates based on building type and lease terms.
      </ThemedText>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" themeColor="textSecondary" accessibilityRole="header">
        {title.toUpperCase()}
      </ThemedText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { gap: Spacing.one, marginTop: Spacing.two },
  locked: { padding: Spacing.four },
  hero: { padding: Spacing.four, gap: Spacing.one },
  heroValue: { fontSize: 44, lineHeight: 52, fontWeight: 700, fontVariant: ['tabular-nums'] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  section: { gap: Spacing.two },
  list: { gap: 0, paddingVertical: Spacing.one },
  alert: { gap: Spacing.one, paddingVertical: Spacing.two },
  alertTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  num: { fontVariant: ['tabular-nums'] },
  wasteRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two },
  note: { marginTop: Spacing.two },
  footnote: { textAlign: 'center' },
});
