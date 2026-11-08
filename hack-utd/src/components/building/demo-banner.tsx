import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MaxContentWidth, Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { formatClock } from '@/data/buildings';
import { useTheme } from '@/hooks/use-theme';
import type { DemoBeat, DemoMood } from '@/lib/demo/live-demo';

const MOOD_TONE: Record<DemoMood, ThemeColor> = {
  calm: 'primary',
  warning: 'warning',
  danger: 'danger',
  relief: 'success',
};

type DemoBannerProps = {
  beat: DemoBeat;
  index: number;
  count: number;
  progress: number;
  paused: boolean;
  isLast: boolean;
  virtualNow: number;
  onTogglePause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onRestart: () => void;
  onExit: () => void;
};

/**
 * Narration bar that sits above the building while the live demo plays.
 * Story clock on the left, what's happening in plain words, and simple controls.
 */
export function DemoBanner(props: DemoBannerProps) {
  const { beat, index, count, progress, paused, isLast, virtualNow } = props;
  const theme = useTheme();
  const tone = MOOD_TONE[beat.mood];

  return (
    <View style={[styles.outer, { backgroundColor: theme.background, borderColor: theme.border }]}>
      <View style={styles.inner}>
        <View style={styles.topRow}>
          <View style={[styles.live, { backgroundColor: theme.dangerSoft }]}>
            <View style={[styles.liveDot, { backgroundColor: theme.danger }]} />
            <ThemedText type="smallBold" themeColor="danger" style={styles.liveText}>
              {paused ? 'PAUSED' : 'LIVE DEMO'}
            </ThemedText>
          </View>
          <ThemedText type="smallBold" themeColor={tone} style={styles.clock}>
            {formatClock(virtualNow)}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {index + 1} / {count}
          </ThemedText>
        </View>

        <ThemedText type="subtitle" themeColor={tone}>
          {beat.headline}
        </ThemedText>
        <ThemedText type="small">{beat.caption}</ThemedText>

        {/* One segment per beat; the current one fills as time passes. */}
        <View style={styles.progress}>
          {Array.from({ length: count }, (_, i) => (
            <View key={i} style={[styles.segment, { backgroundColor: theme.backgroundSelected }]}>
              <View
                style={[
                  styles.segmentFill,
                  {
                    backgroundColor: theme[tone],
                    width: i < index ? '100%' : i === index ? `${(isLast ? 1 : progress) * 100}%` : '0%',
                  },
                ]}
              />
            </View>
          ))}
        </View>

        <View style={styles.controls}>
          <Button title="‹" size="sm" variant="secondary" onPress={props.onPrev} disabled={index === 0} />
          {isLast ? (
            <Button title="↺ Replay" size="sm" variant="secondary" onPress={props.onRestart} />
          ) : (
            <Button title={paused ? '▶ Resume' : '❚❚ Pause'} size="sm" variant="secondary" onPress={props.onTogglePause} />
          )}
          <Button title="›" size="sm" variant="secondary" onPress={props.onNext} disabled={isLast} />
          <View style={styles.spacer} />
          <Button title="Exit demo" size="sm" variant="ghost" onPress={props.onExit} />
        </View>
      </View>
    </View>
  );
}

/** "How it went" card on the last beat. */
export function DemoRecap({ items }: { items: { label: string; value: string }[] }) {
  const theme = useTheme();
  return (
    <Card style={{ borderColor: theme.success, backgroundColor: theme.successSoft }}>
      <ThemedText type="smallBold" themeColor="success">
        HOW LAST NIGHT WENT
      </ThemedText>
      <View style={styles.recapGrid}>
        {items.map((item) => (
          <View key={item.label} style={styles.recapItem}>
            <ThemedText type="subtitle">{item.value}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {item.label}
            </ThemedText>
          </View>
        ))}
      </View>
      <ThemedText type="small">
        Nobody was a hero and nothing was luck. The warning came early, one person clearly owned it,
        and the next shift knows what happened.
      </ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  outer: { borderBottomWidth: 1, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', gap: Spacing.two },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  live: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  liveText: { fontSize: 11, lineHeight: 16, letterSpacing: 0.5 },
  clock: { flex: 1, fontVariant: ['tabular-nums'] },
  progress: { flexDirection: 'row', gap: Spacing.one },
  segment: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  segmentFill: { height: '100%' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  spacer: { flex: 1 },
  recapGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  recapItem: { minWidth: 120, flexGrow: 1 },
});
