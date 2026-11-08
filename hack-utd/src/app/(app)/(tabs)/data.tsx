import { useNavigation } from 'expo-router';
import type { BottomTabNavigationProp } from 'expo-router/js-tabs';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AtAGlance } from '@/components/building/at-a-glance';
import { BackupPowerCard } from '@/components/building/backup-power-card';
import { DangerCountdown } from '@/components/building/danger-countdown';
import { DemoBanner, DemoRecap } from '@/components/building/demo-banner';
import { EventTimeline } from '@/components/building/event-timeline';
import { Readings } from '@/components/building/readings';
import { SecurityPanel } from '@/components/building/security-panel';
import { BuildingPicker } from '@/components/building-picker';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Radius, Spacing } from '@/constants/theme';
import {
  BUILDING_TYPE_LABELS,
  getBuilding,
  isDataCenter,
  type Alert,
  type Building,
} from '@/data/buildings';
import { useTheme } from '@/hooks/use-theme';
import { useLiveDataTab } from '@/features/alerts/data-tab-bridge';
import { useLiveDemo } from '@/lib/demo/live-demo';
import { buildTimeline } from '@/lib/incidents/timeline';
import { NowProvider, useTicker } from '@/lib/time/now';

type View_ = 'overview' | 'timeline' | 'security';

/**
 * Data tab.
 * 1. Shows a "Pick a building" button that opens the pop-up.
 * 2. After picking, shows how that building is doing in plain words: a summary,
 *    a "time until too hot" countdown, readings, and backup power. Plus a
 *    "What happened" timeline.
 * 3. Data centers also get a Security view.
 * 4. "Live demo" plays a scripted overnight incident at Dallas DC-2.
 *
 * Alerts are not listed here. They're moving to the Home page.
 */
export default function DataScreen() {
  // Which building is picked (null = none yet).
  const [buildingId, setBuildingId] = useState<string | null>(null);
  // Is the pop-up showing? Starts closed — the user opens it with the button.
  const [pickerOpen, setPickerOpen] = useState(false);
  // Which view is showing for the building.
  const [view, setView] = useState<View_>('overview');

  // Live clock for the countdown. The demo runs its own, faster one.
  const realNow = useTicker(1000);
  const demo = useLiveDemo();
  // Same sensor readings and alerts as Home (Supabase, or built-in demo data offline).
  const { liveBuilding, liveAlerts } = useLiveDataTab();

  // Tapping "Data" in the bottom tab bar resets back to the start
  // (no building picked, pop-up closed, demo stopped).
  const navigation = useNavigation<BottomTabNavigationProp<Record<string, undefined>>>();
  const stopDemo = demo.active ? demo.stop : undefined;
  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', () => {
      setBuildingId(null);
      setPickerOpen(false);
      setView('overview');
      stopDemo?.();
    });
    return unsubscribe; // stop listening when the screen goes away
  }, [navigation, stopDemo]);

  function handleSelect(id: string) {
    setBuildingId(id);
    setView('overview'); // new building → start on Overview
    setPickerOpen(false);
  }

  function startDemo() {
    setPickerOpen(false);
    setView('overview');
    demo.start();
  }

  // What to show: the demo's snapshot, or the live data.
  let content: { building: Building; alerts: Alert[] } | null = null;
  if (demo.active) {
    content = { building: demo.beat.building, alerts: demo.beat.alerts };
  } else {
    const building = buildingId ? getBuilding(buildingId) : undefined;
    if (building) content = { building: liveBuilding(building), alerts: liveAlerts(building.id) };
  }

  return (
    <NowProvider value={demo.active ? demo.virtualNow : realNow}>
      <View style={styles.flex}>
        {demo.active && (
          <DemoBanner
            beat={demo.beat}
            index={demo.index}
            count={demo.count}
            progress={demo.progress}
            paused={demo.paused}
            isLast={demo.isLast}
            virtualNow={demo.virtualNow}
            onTogglePause={demo.togglePause}
            onPrev={demo.prev}
            onNext={demo.next}
            onRestart={demo.start}
            onExit={demo.stop}
          />
        )}

        <Screen edges={['left', 'right']}>
          {content ? (
            <BuildingDetails
              {...content}
              view={view}
              onChangeView={setView}
              onChangeBuilding={() => {
                if (demo.active) demo.stop();
                setPickerOpen(true);
              }}
              recap={demo.active ? demo.beat.recap : undefined}
            />
          ) : (
            <NoBuildingYet onPick={() => setPickerOpen(true)} onStartDemo={startDemo} />
          )}
        </Screen>
      </View>

      <BuildingPicker
        visible={pickerOpen}
        selectedId={buildingId}
        onSelect={handleSelect}
        onClose={() => setPickerOpen(false)}
      />
    </NowProvider>
  );
}

// ─── Shown before any building is picked ────────────────────────────────────

function NoBuildingYet({ onPick, onStartDemo }: { onPick: () => void; onStartDemo: () => void }) {
  return (
    <>
      <Card style={styles.empty}>
        <ThemedText type="subtitle">No building selected</ThemedText>
        <ThemedText themeColor="textSecondary">
          Pick a building to see how it’s doing right now: room temperatures, power, heating and
          cooling, and how many people are inside.
        </ThemedText>
        <Button title="Pick a building" onPress={onPick} />
      </Card>

      <Card style={styles.empty}>
        <ThemedText type="subtitle">See it handle a real night</ThemedText>
        <ThemedText themeColor="textSecondary">
          A one-minute replay of a 2 AM problem at Dallas DC-2. A storm makes the power flicker, a
          server room starts overheating, and the team fixes it before anything breaks.
        </ThemedText>
        <Button title="▶ Play live demo" variant="secondary" onPress={onStartDemo} />
      </Card>
    </>
  );
}

// ─── The building screen (#4 in the app flow) ───────────────────────────────

type BuildingDetailsProps = {
  building: Building;
  alerts: Alert[];
  view: View_;
  onChangeView: (view: View_) => void;
  onChangeBuilding: () => void;
  recap?: { label: string; value: string }[];
};

function BuildingDetails({
  building,
  alerts,
  view,
  onChangeView,
  onChangeBuilding,
  recap,
}: BuildingDetailsProps) {
  const showSecurity = isDataCenter(building) && !!building.security;

  const options: { value: View_; label: string }[] = [
    { value: 'overview', label: 'Right now' },
    { value: 'timeline', label: 'What happened' },
  ];
  if (showSecurity) options.push({ value: 'security', label: '🔒 Security' });
  const activeView = view === 'security' && !showSecurity ? 'overview' : view;

  return (
    <>
      {/* Header: name, type, address, change button */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <ThemedText type="title">{building.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {BUILDING_TYPE_LABELS[building.type]} · {building.address}
          </ThemedText>
        </View>
        <View style={styles.headerButtons}>
          <Button title="Change" variant="secondary" size="sm" onPress={onChangeBuilding} />
        </View>
      </View>

      <ViewSwitch value={activeView} onChange={onChangeView} options={options} />

      {activeView === 'security' && building.security ? (
        <SecurityPanel security={building.security} />
      ) : activeView === 'timeline' ? (
        <EventTimeline {...buildTimeline(building, alerts)} />
      ) : (
        <>
          {recap && <DemoRecap items={recap} />}
          <AtAGlance building={building} />
          <DangerCountdown building={building} alerts={alerts} />
          <Readings building={building} />
          <BackupPowerCard power={building.power} />
        </>
      )}
    </>
  );
}

// ─── Segmented toggle (Right now | What happened | Security) ────────────────

type ViewSwitchProps = {
  value: View_;
  onChange: (value: View_) => void;
  options: { value: View_; label: string }[];
};

function ViewSwitch({ value, onChange, options }: ViewSwitchProps) {
  const theme = useTheme();
  return (
    <View
      style={[styles.switch, { backgroundColor: theme.backgroundSelected }]}
      accessibilityRole="tablist">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[
              styles.switchOption,
              selected && { backgroundColor: theme.backgroundElement },
            ]}>
            <ThemedText type="smallBold" themeColor={selected ? 'text' : 'textSecondary'}>
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  empty: { padding: Spacing.four, gap: Spacing.three, marginTop: Spacing.three },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  headerText: { flex: 1, gap: Spacing.one },
  headerButtons: { alignItems: 'flex-end', gap: Spacing.one },
  switch: { flexDirection: 'row', padding: Spacing.one, borderRadius: Radius.md },
  switchOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Radius.sm,
  },
});
