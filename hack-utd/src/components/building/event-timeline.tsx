import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { formatClock, formatTimeAgo } from '@/data/buildings';
import { useTheme } from '@/hooks/use-theme';
import type { TimelineCategory, TimelineItem, TimelineThread } from '@/lib/incidents/timeline';
import { useNow } from '@/lib/time/now';

const CATEGORY: Record<TimelineCategory, { icon: string; label: string; tone: ThemeColor }> = {
  power: { icon: '⚡', label: 'Power', tone: 'warning' },
  cooling: { icon: '❄', label: 'Cooling', tone: 'primary' },
  weather: { icon: '⛈', label: 'Weather', tone: 'textSecondary' },
  people: { icon: '👤', label: 'People', tone: 'success' },
  network: { icon: '⌘', label: 'Computer security', tone: 'danger' },
  security: { icon: '🔒', label: 'Building security', tone: 'danger' },
  alert: { icon: '!', label: 'Problem spotted', tone: 'danger' },
};

/**
 * Everything that happened in the building on one line: power blips, cooling,
 * weather, badge swipes, logins, alerts, and what people did about them.
 *
 * Pick a problem to "follow the thread". Related events light up and the rest
 * fade back, so you can see how a 0.4-second blip became a hot server room.
 */
export function EventTimeline({ items, threads }: { items: TimelineItem[]; threads: TimelineThread[] }) {
  const theme = useTheme();
  const now = useNow();
  const [thread, setThread] = useState<string | null>(null);

  const shown = items.filter((i) => Date.parse(i.at) <= now);
  const related = (i: TimelineItem) => !thread || i.relatedTo.includes(thread);
  const relatedCount = thread ? shown.filter(related).length : shown.length;

  return (
    <View style={styles.container}>
      <View>
        <ThemedText type="subtitle">What happened, in order</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Everything the building’s sensors and staff reported, oldest first. Tap a problem below to
          highlight what led to it.
        </ThemedText>
      </View>

      {threads.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label="Show everything" selected={!thread} onPress={() => setThread(null)} />
          {threads.map((t) => (
            <Chip
              key={t.id}
              label={`What led to: ${t.label}`}
              selected={thread === t.id}
              onPress={() => setThread(thread === t.id ? null : t.id)}
            />
          ))}
        </ScrollView>
      )}

      {thread && (
        <ThemedText type="small" themeColor="primary">
          {relatedCount} of {shown.length} events are connected to this problem. The rest are faded.
        </ThemedText>
      )}

      <Card style={styles.card}>
        {shown.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            Nothing recorded yet.
          </ThemedText>
        ) : (
          shown.map((item) => <Row key={item.id} item={item} faded={!related(item)} now={now} />)
        )}
        <View style={styles.nowRow}>
          <View style={[styles.nowDot, { backgroundColor: theme.primary }]} />
          <ThemedText type="smallBold" themeColor="primary">
            NOW · {formatClock(now)}
          </ThemedText>
        </View>
      </Card>
    </View>
  );
}

function Row({ item, faded, now }: { item: TimelineItem; faded: boolean; now: number }) {
  const theme = useTheme();
  const cat = CATEGORY[item.category];
  const isAlert = item.category === 'alert';

  return (
    <View style={[styles.row, faded && styles.faded]}>
      <View style={styles.timeCol}>
        <ThemedText type="smallBold" style={styles.time}>
          {formatClock(item.at)}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.ago}>
          {formatTimeAgo(item.at, now)}
        </ThemedText>
      </View>

      <View style={styles.railCol}>
        <View
          style={[
            styles.icon,
            {
              backgroundColor: isAlert ? theme.danger : theme.backgroundSelected,
              borderColor: theme[cat.tone],
            },
          ]}>
          <ThemedText style={[styles.iconText, isAlert && { color: theme.primaryText }]}>{cat.icon}</ThemedText>
        </View>
        <View style={[styles.rail, { backgroundColor: theme.border }]} />
      </View>

      <View style={styles.body}>
        <ThemedText type="smallBold" themeColor={isAlert ? 'danger' : 'text'}>
          {item.title}
        </ThemedText>
        {item.detail && (
          <ThemedText type="small" themeColor="textSecondary">
            {item.detail}
          </ThemedText>
        )}
        <View style={styles.meta}>
          {item.who && <Avatar name={item.who} size={18} />}
          <ThemedText type="small" themeColor="textSecondary" style={styles.metaText}>
            {[cat.label, item.who, item.source].filter(Boolean).join(' · ')}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? theme.primary : theme.backgroundElement,
          borderColor: selected ? theme.primary : theme.border,
        },
      ]}>
      <ThemedText type="smallBold" style={{ color: selected ? theme.primaryText : theme.text }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.three },
  chips: { gap: Spacing.two },
  chip: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
  },
  card: { gap: 0 },
  row: { flexDirection: 'row', gap: Spacing.two },
  faded: { opacity: 0.3 },
  timeCol: { width: 64, alignItems: 'flex-end', paddingTop: 2 },
  time: { fontSize: 13, lineHeight: 18, fontVariant: ['tabular-nums'] },
  ago: { fontSize: 11, lineHeight: 14 },
  railCol: { alignItems: 'center', width: 28 },
  icon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: 13, lineHeight: 16 },
  rail: { width: 2, flex: 1, minHeight: 12 },
  body: { flex: 1, paddingBottom: Spacing.three, gap: Spacing.half },
  meta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  metaText: { fontSize: 12, lineHeight: 16, flexShrink: 1 },
  nowRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingLeft: 64 + Spacing.two + 9 },
  nowDot: { width: 10, height: 10, borderRadius: 5 },
});
