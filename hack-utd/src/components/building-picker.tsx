import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import {
  alertsForBuilding,
  BUILDING_TYPE_LABELS,
  BUILDINGS,
  formatMoney,
} from '@/data/buildings';
import { useTheme } from '@/hooks/use-theme';

type BuildingPickerProps = {
  visible: boolean;
  selectedId: string | null;
  onSelect: (buildingId: string) => void;
  onClose: () => void;
};

/** The "Pick a building" pop-up shown when you open the Data tab. */
export function BuildingPicker({ visible, selectedId, onSelect, onClose }: BuildingPickerProps) {
  const theme = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* Tapping the dark area behind the pop-up closes it. */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close building picker"
        />

        <View
          style={[styles.sheet, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <View style={styles.header}>
            <ThemedText type="subtitle">Pick a building</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              See its live data and alerts.
            </ThemedText>
          </View>

          {BUILDINGS.map((building) => {
            const selected = building.id === selectedId;
            const alerts = alertsForBuilding(building.id);
            const atRisk = alerts.reduce((sum, a) => sum + a.costAtRisk, 0);

            return (
              <Pressable
                key={building.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => onSelect(building.id)}
                style={({ pressed }) => [
                  styles.option,
                  {
                    borderColor: selected ? theme.primary : theme.border,
                    backgroundColor: selected ? theme.primarySoft : theme.backgroundElement,
                  },
                  pressed && styles.pressed,
                ]}>
                <View style={styles.optionText}>
                  <ThemedText type="smallBold">{building.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {BUILDING_TYPE_LABELS[building.type]} · {building.address}
                  </ThemedText>
                </View>

                <View style={styles.optionRisk}>
                  <ThemedText type="smallBold" themeColor={atRisk > 0 ? 'danger' : 'success'}>
                    {atRisk > 0 ? formatMoney(atRisk) : 'All clear'}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {alerts.length} {alerts.length === 1 ? 'alert' : 'alerts'}
                  </ThemedText>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.three,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    width: '100%',
    maxWidth: 480,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  header: { gap: Spacing.one, marginBottom: Spacing.two },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  optionText: { flex: 1 },
  optionRisk: { alignItems: 'flex-end' },
  pressed: { opacity: 0.75 },
});
