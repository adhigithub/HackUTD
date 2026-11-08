import { memo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

/** Distance between minor grid lines, in px. */
const CELL = 24;
/** Every Nth line is a heavier "major" line, like blueprint paper. */
const MAJOR_EVERY = 5;
/** Clockwise tilt so the grid never lines up with cards and boxes. */
const TILT = '6deg';

/**
 * Blueprint-style grid drawn behind screen content. The grid is rotated slightly,
 * so it is drawn larger than the screen to keep the corners covered.
 */
export const GridBackground = memo(function GridBackground() {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();

  // A square as wide as the screen's diagonal covers every corner at any rotation.
  const size = Math.ceil(Math.hypot(width, height) / CELL) * CELL + CELL * 2;
  const count = size / CELL + 1;

  const lines = [];
  for (let i = 0; i < count; i++) {
    const major = i % MAJOR_EVERY === 0;
    const color = major ? theme.gridLineMajor : theme.gridLine;
    const thickness = major ? 1 : StyleSheet.hairlineWidth;
    const offset = i * CELL;
    lines.push(
      <View
        key={`v${i}`}
        style={[styles.line, { left: offset, top: 0, width: thickness, height: size, backgroundColor: color }]}
      />,
      <View
        key={`h${i}`}
        style={[styles.line, { top: offset, left: 0, height: thickness, width: size, backgroundColor: color }]}
      />
    );
  }

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.clip]}>
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          left: (width - size) / 2,
          top: (height - size) / 2,
          transform: [{ rotate: TILT }],
        }}>
        {lines}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  line: { position: 'absolute' },
});
