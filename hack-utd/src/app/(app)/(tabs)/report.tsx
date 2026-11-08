import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';

import { AskAiCard } from '@/components/report/ask-ai-card';
import { BarList } from '@/components/report/bar-list';
import { ChainLegend, IncidentCard, Pill } from '@/components/report/incident-card';
import { SegmentedControl } from '@/components/report/segmented-control';
import { StatTile } from '@/components/report/stat-tile';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useLiveReportEntries } from '@/features/alerts/report-bridge';
import { useAuth } from '@/lib/auth/auth-context';
import { can } from '@/lib/auth/types';
import { formatShortDate, formatUSD, formatUSDCompact, plural } from '@/lib/portfolio/format';
import { buildReport, buildingName, reportAsText, type ReportPeriod } from '@/lib/portfolio/report';
import { BUILDING_TYPE_LABELS, CATEGORY_LABELS } from '@/lib/portfolio/types';

const PERIOD_OPTIONS: { value: ReportPeriod; label: string }[] = [
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
];

/** How many stopped problems to show before "Show all". */
const INCIDENT_PREVIEW = 3;

const HOW_IT_WORKS = [
  {
    title: 'Connect',
    text: 'We combine data that usually lives in separate systems: AC, power, sensors, key cards, repair history, and tenant contracts.',
  },
  {
    title: 'Predict',
    text: 'We spot problems early and estimate what they would cost if nobody acted.',
  },
  {
    title: 'Fix',
    text: 'We fix them automatically or with one tap, before they spread.',
  },
];

export default function ReportScreen() {
  const { user } = useAuth();
  const theme = useTheme();
  const [period, setPeriod] = useState<ReportPeriod>(30);
  const [showHow, setShowHow] = useState(true);
  const [showAllIncidents, setShowAllIncidents] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  // Fixes approved in the app (and overnight auto-fixes) show up here right away.
  const live = useLiveReportEntries();
  const report = useMemo(() => buildReport(period, new Date(), live), [period, live]);

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

  const incidents = showAllIncidents ? report.incidents : report.incidents.slice(0, INCIDENT_PREVIEW);
  const hiddenCount = report.incidents.length - incidents.length;

  return (
    <Screen edges={['left', 'right']}>
      <View style={styles.page}>
        {/* ---------- Title ---------- */}
        <View style={styles.block}>
          <View style={styles.header}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              CLIENT REPORT · {formatShortDate(report.startISO)} – {formatShortDate(report.endISO)}
            </ThemedText>
            <ThemedText type="title">What BluePrint saved you</ThemedText>
          </View>
          <SegmentedControl
            accessibilityLabel="Report period"
            options={PERIOD_OPTIONS}
            value={period}
            onChange={(p) => {
              setPeriod(p);
              setShowAllIncidents(false);
            }}
          />
        </View>

        {/* ---------- How it works (for first-time viewers) ---------- */}
        <Card style={styles.how}>
          <View style={styles.rowBetween}>
            <ThemedText type="smallBold">How BluePrint works</ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: showHow }}
              onPress={() => setShowHow((v) => !v)}
              hitSlop={10}>
              <ThemedText type="smallBold" themeColor="primary">
                {showHow ? 'Hide' : 'Show'}
              </ThemedText>
            </Pressable>
          </View>
          {showHow
            ? HOW_IT_WORKS.map((step, i) => (
                <View key={step.title} style={styles.howStep}>
                  <View style={[styles.howNum, { backgroundColor: theme.primarySoft }]}>
                    <ThemedText type="smallBold" themeColor="primary">
                      {i + 1}
                    </ThemedText>
                  </View>
                  <View style={styles.flex}>
                    <ThemedText type="smallBold">{step.title}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {step.text}
                    </ThemedText>
                  </View>
                </View>
              ))
            : null}
        </Card>

        {/* ---------- The headline ---------- */}
        <View style={styles.block}>
          <Card style={styles.hero}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Money saved
            </ThemedText>
            <ThemedText style={[styles.heroValue, { color: theme.success }]}>
              {formatUSD(report.totalSaved)}
            </ThemedText>
            <View style={[styles.heroSplit, { borderTopColor: theme.border }]}>
              <HeroPart
                value={formatUSD(report.incidentSavings)}
                label={`from stopping ${plural(report.incidents.length, 'problem')} early`}
              />
              <HeroPart value={formatUSD(report.wasteSaved)} label="from turning off empty buildings at night" />
            </View>
          </Card>

          <View style={styles.grid}>
            <StatTile label="Power outages prevented" value={String(report.outagesPrevented)} />
            <StatTile label="Breakdowns caught early" value={String(report.failuresPrevented)} />
            <StatTile label="Break-ins stopped" value={String(report.threatsStopped)} />
            <StatTile
              label="Nights we turned off empty buildings"
              value={String(report.wasteNights)}
              detail={`Saves about ${formatUSDCompact(report.wasteAnnualized)} a year`}
            />
          </View>
        </View>

        {/* ---------- Ask AI ---------- */}
        <AskAiCard role={user.role} period={period} />

        {/* ---------- Problems stopped (the domino chains) ---------- */}
        <Section
          title="Problems we stopped early"
          description="Small problems spread like falling dominoes. Each card shows how one would have spread, and where we stopped it.">
          <ChainLegend />
          {report.incidents.length ? (
            <>
              {incidents.map((i) => (
                <IncidentCard key={i.id} incident={i} />
              ))}
              {hiddenCount > 0 || showAllIncidents ? (
                <Button
                  variant="secondary"
                  title={showAllIncidents ? 'Show fewer' : `Show ${plural(hiddenCount, 'more problem')}`}
                  onPress={() => setShowAllIncidents((v) => !v)}
                />
              ) : null}
            </>
          ) : (
            <Card>
              <ThemedText themeColor="textSecondary">No problems needed stopping in this period.</ThemedText>
            </Card>
          )}
        </Section>

        {/* ---------- Open alerts ---------- */}
        <Section
          title="Needs attention now"
          description={`${plural(report.activeAlerts.length, 'problem')} still open. If ignored, they could cost ${formatUSD(report.moneyAtRisk)}.`}>
          {report.activeAlerts.map((a) => (
            <Card key={a.id} style={styles.alert}>
              <View style={styles.rowBetween}>
                <Pill
                  label={a.severity === 'act' ? 'Act now' : 'Keep an eye on'}
                  fg={a.severity === 'act' ? 'danger' : 'warning'}
                  bg={a.severity === 'act' ? 'dangerSoft' : 'warningSoft'}
                />
                <ThemedText type="small" themeColor="textSecondary">
                  {buildingName(a.buildingId)}
                </ThemedText>
              </View>
              <ThemedText type="smallBold" style={styles.alertTitle}>
                {a.title}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {a.detail}
              </ThemedText>
              <View style={[styles.alertFacts, { backgroundColor: theme.background }]}>
                <Fact label="Could cost" value={formatUSD(a.moneyAtRisk)} />
                <Fact label="Gets worse" value={a.eta} />
              </View>
              <ThemedText type="small">
                <ThemedText type="smallBold">Suggested fix: </ThemedText>
                {a.recommendedFix}
              </ThemedText>
            </Card>
          ))}
        </Section>

        {/* ---------- Breakdowns ---------- */}
        <Section
          title="Savings by building"
          description="The same problem costs more in some buildings. Losing power for 10 minutes is a hassle at a mall, but a disaster at a data center that promised to stay online.">
          <Card style={styles.padded}>
            <BarList
              items={report.byBuilding.map((b) => ({
                key: b.building.id,
                label: b.building.name,
                sublabel: `${BUILDING_TYPE_LABELS[b.building.type]} · ${plural(b.incidents, 'problem')} stopped`,
                value: b.saved,
                valueLabel: formatUSD(b.saved),
              }))}
            />
          </Card>
        </Section>

        <Section title="Savings by type of problem">
          <Card style={styles.padded}>
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

        <Section
          title="Energy saved at night"
          description="When a space is empty after hours but the AC or lights are still on, we switch it to night mode. It turns back on as soon as someone badges in.">
          <Card style={styles.list}>
            {report.wasteByZone.map((z, i) => (
              <View
                key={`${z.building.id}-${z.zone}`}
                style={[styles.wasteRow, i > 0 && { borderTopWidth: 1, borderTopColor: theme.border }]}>
                <View style={styles.flex}>
                  <ThemedText type="smallBold">{z.building.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {z.zone} · {plural(z.nights, 'night')}
                  </ThemedText>
                </View>
                <ThemedText type="smallBold" style={styles.num}>
                  {formatUSD(z.saved)}
                </ThemedText>
              </View>
            ))}
          </Card>
        </Section>

        {/* ---------- Share ---------- */}
        <View style={styles.block}>
          <Button title="Share this report" variant="secondary" onPress={share} />
          {shareError ? (
            <ThemedText type="small" themeColor="danger" style={styles.center}>
              {shareError}
            </ThemedText>
          ) : null}
          <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
            Demo data. Dollar amounts are estimates based on the type of building and its tenant contracts.
          </ThemedText>
        </View>
      </View>
    </Screen>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <ThemedText type="subtitle" accessibilityRole="header">
          {title}
        </ThemedText>
        {description ? (
          <ThemedText type="small" themeColor="textSecondary">
            {description}
          </ThemedText>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function HeroPart({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.heroPart}>
      <ThemedText type="smallBold" style={styles.num}>
        {value}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold">{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  num: { fontVariant: ['tabular-nums'] },
  // Big gaps between sections so each one reads on its own.
  page: { gap: Spacing.five, paddingBottom: Spacing.four },
  block: { gap: Spacing.three },
  header: { gap: Spacing.one, marginTop: Spacing.two },
  locked: { padding: Spacing.four },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },

  how: { gap: Spacing.three, padding: Spacing.three },
  howStep: { flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-start' },
  howNum: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  hero: { padding: Spacing.four, gap: Spacing.one },
  heroValue: { fontSize: 44, lineHeight: 52, fontWeight: 700, fontVariant: ['tabular-nums'] },
  heroSplit: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    borderTopWidth: 1,
    paddingTop: Spacing.three,
    marginTop: Spacing.two,
  },
  heroPart: { flexGrow: 1, flexBasis: 140, gap: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },

  section: { gap: Spacing.three },
  sectionHead: { gap: Spacing.one },
  padded: { padding: Spacing.four },

  alert: { gap: Spacing.two, padding: Spacing.three },
  alertTitle: { fontSize: 17, lineHeight: 23 },
  alertFacts: {
    flexDirection: 'row',
    gap: Spacing.four,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  fact: { gap: 2 },

  list: { gap: 0, paddingVertical: Spacing.one },
  wasteRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.three },
});
