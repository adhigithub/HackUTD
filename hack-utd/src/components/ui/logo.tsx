import Svg, { G, Line, Polygon } from 'react-native-svg';

type LogoProps = {
  size?: number;
  /** Main brand fill. */
  color?: string;
  /** Fill for the light tower faces and the gaps between shapes. */
  background?: string;
};

const TALL_TOWER = '66,70 122,42 182,68 182,350 122,372 66,352';
const TALL_TOWER_SIDE = '122,42 182,68 182,350 122,372';
const SHORT_TOWER = '172,205 192,195 220,208 220,348 192,360 172,352';
const SHORT_TOWER_SIDE = '192,195 220,208 220,348 192,360';
const K_SHAPE = '140,38 442,38 326,205 452,356 230,356 230,200 185,200 185,62';

/** BluePrint mark: two isometric towers in front of a blocky "K". */
export function Logo({ size = 56, color = '#3F48CC', background = '#FFFFFF' }: LogoProps) {
  return (
    <Svg width={size} height={size * 0.8} viewBox="20 20 450 360">
      {/* Back "K" block, split into panels by gap lines */}
      <Polygon points={K_SHAPE} fill={color} />
      <G stroke={background} strokeWidth={6}>
        <Line x1={320} y1={30} x2={320} y2={360} />
        <Line x1={180} y1={86} x2={420} y2={86} />
      </G>

      {/* Tall tower: halo separates it from the K, then outline + shaded side */}
      <Polygon points={TALL_TOWER} fill={background} stroke={background} strokeWidth={18} strokeLinejoin="round" />
      <Polygon points={TALL_TOWER} fill={background} stroke={color} strokeWidth={6} strokeLinejoin="round" />
      <Polygon points={TALL_TOWER_SIDE} fill={color} stroke={color} strokeWidth={6} strokeLinejoin="round" />

      {/* Short tower */}
      <Polygon points={SHORT_TOWER} fill={background} stroke={background} strokeWidth={16} strokeLinejoin="round" />
      <Polygon points={SHORT_TOWER} fill={background} stroke={color} strokeWidth={6} strokeLinejoin="round" />
      <Polygon points={SHORT_TOWER_SIDE} fill={color} stroke={color} strokeWidth={6} strokeLinejoin="round" />
    </Svg>
  );
}
