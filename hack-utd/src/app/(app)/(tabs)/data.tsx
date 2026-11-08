import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AlertCard } from '@/components/building/alert-card';
import { Readings } from '@/components/building/readings';
import { SecurityPanel } from '@/components/building/security-panel';
import { BuildingPicker } from '@/components/building-picker';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Radius, Spacing } from '@/constants/theme';
import {
  alertsForBuilding,
  BUILDING_TYPE_LABELS,
  getBuilding,
  isDataCenter,
  type Building,
} from '@/data/buildings';
import { useTheme } from '@/hooks/use-theme';

type View_ = 'overview' | 'security';

/**
 * Data tab.
 * 1. Opens with the "Pick a building" pop-up.
 * 2. After picking, shows that building's live readings and alerts.
 * 3. Data centers also get a Security view.
 */
export default function DataScreen() {
  // Which building is picked (null = none yet).
  const [buildingId, setBuildingId] = useState<string | null>(null);
  // Is the pop-up showing? Starts open so it appears when you open the tab.
  const [pickerOpen, setPickerOpen] = useState(true);
  // Which view is showing for the building.
  const [view, setView] = useState<View_>('overview');

  const building = buildingId ? getBuilding(buildingId) : undefined;

  function handleSelect(id: string) {
    setBuildingId(id);
    setView('overview'); // new building → start on Overview
    setPickerOpen(false);
  }

  return (
    <>
      <Screen edges={['left', 'right']}>
        {building ? (
          <BuildingDetails
            building={building}
            view={view}
            onChangeView={setView}
            onChangeBuilding={() => setPickerOpen(true)}
          />
        ) : (
          <NoBuildingYet onPick={() => setPickerOpen(true)} />
        )}
      </Screen>

      <BuildingPicker
        visible={pickerOpen}
        selectedId={buildingId}
        onSelect={handleSelect}
        onClose={() => setPickerOpen(false)}
      />
    </>
  );
}

// ─── Shown if the pop-up is closed without picking anything ─────────────────

function NoBuildingYet({ onPick }: { onPick: () => void }) {
  return (
    <Card style={styles.empty}>
      <ThemedText type="subtitle">No building selected</ThemedText>
      <ThemedText themeColor="textSecondary">
        Pick a building to see its live HVAC, power, temperature, and occupancy.
      </ThemedText>
      <Button title="Pick a building" onPress={onPick} />
    </Card>
  );
}

// ─── The building screen (#4 in the app flow) ───────────────────────────────

type BuildingDetailsProps = {
  building: Building;
  view: View_;
  onChangeView: (view: View_) => void;
  onChangeBuilding: () => void;
};

function BuildingDetails({ building, view, onChangeView, onChangeBuilding }: BuildingDetailsProps) {
  const alerts = alertsForBuilding(building.id);
  const showSecurity = isDataCenter(building) && !!building.security;

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
        <Button title="Change" variant="secondary" size="sm" onPress={onChangeBuilding} />
      </View>

      {/* Overview / Security switch — only data centers get it */}
      {showSecurity && (
        <ViewSwitch
          value={view}
          onChange={onChangeView}
          options={[
            { value: 'overview', label: 'Overview' },
            { value: 'security', label: '🔒 Security' },
          ]}
        />
      )}

      {view === 'security' && building.security ? (
        <SecurityPanel security={building.security} />
      ) : (
        <>
          <Readings building={building} />

          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Alerts ({alerts.length})
          </ThemedText>
          {alerts.length === 0 ? (
            <Card>
              <ThemedText themeColor="success">All clear. Nothing needs attention.</ThemedText>
            </Card>
          ) : (
            // TODO: once Alert Detail exists, add
            //   onPress={() => router.push(`/alerts/${alert.id}`)}
            alerts.map((alert) => <AlertCard key={alert.id} alert={alert} />)
          )}
        </>
      )}
    </>
  );
}

// ─── Two-button toggle (Overview | Security) ────────────────────────────────

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
  empty: { padding: Spacing.four, gap: Spacing.three, marginTop: Spacing.three },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  headerText: { flex: 1, gap: Spacing.one },
  sectionTitle: { marginTop: Spacing.two },
  switch: { flexDirection: 'row', padding: Spacing.one, borderRadius: Radius.md },
  switchOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Radius.sm,
  },
});
