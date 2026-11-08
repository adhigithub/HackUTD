/**
 * Mock building data for the Upstream demo.
 *
 * In a real product each section below would come from a different system
 * (BMS for HVAC, smart meters for power, badge readers for occupancy, the
 * lease database, the repair-ticket system, a weather API). Here it all lives
 * in one file so every screen shows the same buildings and the same numbers.
 *
 * All dollar figures are sample estimates — swap in real ones from CBRE.
 */

// ─── Types: what a building looks like ──────────────────────────────────────

export type BuildingType = 'data-center' | 'mall' | 'office';

export const BUILDING_TYPE_LABELS: Record<BuildingType, string> = {
  'data-center': 'Data center',
  mall: 'Shopping mall',
  office: 'Office',
};

export type Severity = 'critical' | 'high' | 'medium' | 'low';

/** Where a reading came from — shown so the demo makes the "connected data" visible. */
export type DataSource =
  | 'BMS'
  | 'Smart meter'
  | 'Panel sensor'
  | 'Temp sensor'
  | 'Badge system'
  | 'Lease'
  | 'Maintenance'
  | 'Weather'
  | 'Battery monitor'
  | 'Network monitor';

export type Trend = 'rising' | 'steady' | 'falling';

export type HvacReading = {
  status: 'on' | 'off' | 'night-mode';
  setpointF: number; // what the HVAC is cooling/heating to
  zonesOn: number;
  zonesTotal: number;
};

export type PowerReading = {
  currentKw: number;
  voltageHealth: 'normal' | 'dipping' | 'critical';
  voltageDipsToday: number;
  backupPower: 'ready' | 'weak' | 'active' | 'none';
};

export type TemperatureReading = {
  label: string; // e.g. "Server Room 2"
  currentF: number;
  dangerF: number; // the line we don't want to cross
  trend: Trend;
};

export type OccupancyReading = {
  peopleNow: number;
  lastBadgeSwipe: string; // ISO time
  openHours: string; // from the lease, e.g. "9 AM – 6 PM" or "24/7"
};

export type Alert = {
  id: string;
  buildingId: string;
  title: string;
  summary: string;
  severity: Severity;
  costAtRisk: number; // $ if nothing is done
  costAfterFix: number; // $ left after the recommended fix
  sources: DataSource[]; // which systems flagged it
  /** How the problem spreads if ignored, step by step. */
  chain: string[];
  /** Recommended fix steps, in order. */
  fixSteps: string[];
  /** Critical alerts at data centers are fixed automatically, then reported. */
  autoFix: boolean;
  detectedAt: string; // ISO time
};

export type SecurityEvent = {
  id: string;
  kind: 'physical' | 'cyber';
  title: string;
  detail: string;
  severity: Severity;
  at: string; // ISO time
};

/** A physical + cyber pair that together means something worse. */
export type LinkedRisk = {
  id: string;
  title: string;
  eventIds: string[]; // SecurityEvent ids that combine into this risk
  costAtRisk: number;
  fixSteps: string[];
};

export type Building = {
  id: string;
  name: string;
  type: BuildingType;
  address: string;
  hvac: HvacReading;
  power: PowerReading;
  temperatures: TemperatureReading[];
  occupancy: OccupancyReading;
  /** Only data centers have this — it's what makes the Security view appear. */
  security?: {
    events: SecurityEvent[];
    linkedRisks: LinkedRisk[];
  };
};

// ─── Demo clock: times are relative to "now" so the demo always looks live ───

function minutesAgo(min: number) {
  return new Date(Date.now() - min * 60_000).toISOString();
}

// ─── The three demo buildings ───────────────────────────────────────────────

export const BUILDINGS: Building[] = [
  {
    id: 'dallas-dc-2',
    name: 'Dallas DC-2',
    type: 'data-center',
    address: '1200 Commerce St, Dallas, TX',
    hvac: { status: 'on', setpointF: 68, zonesOn: 12, zonesTotal: 12 },
    power: { currentKw: 4200, voltageHealth: 'dipping', voltageDipsToday: 3, backupPower: 'weak' },
    temperatures: [
      { label: 'Server Room 1', currentF: 71, dangerF: 80, trend: 'steady' },
      { label: 'Server Room 2', currentF: 78, dangerF: 80, trend: 'rising' },
      { label: 'Battery Room', currentF: 74, dangerF: 85, trend: 'steady' },
    ],
    occupancy: { peopleNow: 6, lastBadgeSwipe: minutesAgo(4), openHours: '24/7' },
    security: {
      events: [
        {
          id: 'sec-badge-2am',
          kind: 'physical',
          title: 'Badge used after hours',
          detail: 'Contractor badge #4471 opened Server Room 2 at 2:04 AM. No work order scheduled.',
          severity: 'high',
          at: minutesAgo(95),
        },
        {
          id: 'sec-camera',
          kind: 'physical',
          title: 'Camera offline',
          detail: 'Camera C-14 (Server Room 2 hallway) stopped recording 10 minutes before the badge swipe.',
          severity: 'medium',
          at: minutesAgo(105),
        },
        {
          id: 'sec-new-login',
          kind: 'cyber',
          title: 'New admin login',
          detail: 'First-ever admin login on rack R2-07 from a local console, 3 minutes after the badge swipe.',
          severity: 'critical',
          at: minutesAgo(92),
        },
        {
          id: 'sec-failed-logins',
          kind: 'cyber',
          title: 'Many failed logins',
          detail: '48 failed SSH logins on the management network in the last hour.',
          severity: 'medium',
          at: minutesAgo(30),
        },
      ],
      linkedRisks: [
        {
          id: 'link-breakin',
          title: 'Possible break-in: after-hours badge + new admin login on that room’s server',
          eventIds: ['sec-camera', 'sec-badge-2am', 'sec-new-login'],
          costAtRisk: 500_000,
          fixSteps: [
            'Disable badge #4471',
            'Block the new admin session on R2-07',
            'Send security team to Server Room 2',
          ],
        },
      ],
    },
  },
  {
    id: 'galleria-mall',
    name: 'Galleria Mall',
    type: 'mall',
    address: '13350 Dallas Pkwy, Dallas, TX',
    hvac: { status: 'on', setpointF: 72, zonesOn: 18, zonesTotal: 20 },
    power: { currentKw: 1800, voltageHealth: 'dipping', voltageDipsToday: 5, backupPower: 'ready' },
    temperatures: [
      { label: 'Food court', currentF: 73, dangerF: 85, trend: 'steady' },
      { label: 'Grocery freezer', currentF: 2, dangerF: 10, trend: 'steady' },
    ],
    occupancy: { peopleNow: 2140, lastBadgeSwipe: minutesAgo(1), openHours: '10 AM – 9 PM' },
  },
  {
    id: 'tower-one',
    name: 'Tower One',
    type: 'office',
    address: '500 N Akard St, Dallas, TX',
    hvac: { status: 'on', setpointF: 68, zonesOn: 10, zonesTotal: 10 },
    power: { currentKw: 300, voltageHealth: 'normal', voltageDipsToday: 0, backupPower: 'ready' },
    temperatures: [{ label: 'Floor 4', currentF: 68, dangerF: 90, trend: 'steady' }],
    occupancy: { peopleNow: 0, lastBadgeSwipe: minutesAgo(285), openHours: '9 AM – 6 PM' },
  },
];

// ─── Alerts (kept separate so Home can rank them across all buildings) ──────

export const ALERTS: Alert[] = [
  {
    id: 'dc2-battery',
    buildingId: 'dallas-dc-2',
    title: 'Backup battery losing strength',
    summary: 'UPS battery bank B is at 61% health and voltage dipped 3× today. A storm is due tonight.',
    severity: 'critical',
    costAtRisk: 240_000,
    costAfterFix: 12_000,
    sources: ['Battery monitor', 'Panel sensor', 'Weather', 'Lease'],
    chain: [
      'Voltage dips during tonight’s storm',
      'Weak backup battery can’t carry the load',
      'Cooling shuts off',
      'Server Room 2 overheats past 80°F',
      'Servers crash — 99.99% uptime promise broken',
    ],
    fixSteps: [
      'Test the generator now',
      'Switch Server Room 2 to backup cooling',
      'Send a technician to replace battery bank B',
    ],
    autoFix: true,
    detectedAt: minutesAgo(12),
  },
  {
    id: 'dc2-server-room-heat',
    buildingId: 'dallas-dc-2',
    title: 'Server Room 2 heating up',
    summary: 'Up 1°F every 10 minutes. Will cross 80°F in about 20 minutes.',
    severity: 'high',
    costAtRisk: 90_000,
    costAfterFix: 0,
    sources: ['Temp sensor', 'BMS'],
    chain: ['Temperature crosses 80°F', 'Servers throttle', 'Servers shut down to protect themselves'],
    fixSteps: ['Turn on backup cooling unit CRAC-4', 'Send a technician to check CRAC-2'],
    autoFix: true,
    detectedAt: minutesAgo(8),
  },
  {
    id: 'mall-lights',
    buildingId: 'galleria-mall',
    title: 'Lights flickering in east wing',
    summary: 'Panel E voltage dipped 5× today and the panel is running at 140°F.',
    severity: 'medium',
    costAtRisk: 5_000,
    costAfterFix: 300,
    sources: ['Panel sensor', 'Maintenance', 'Lease'],
    chain: ['Panel E fails', 'East wing loses power', 'Stores close, grocery freezers warm up'],
    fixSteps: ['Book an electrician for Panel E', 'Move grocery freezers to backup circuit'],
    autoFix: false,
    detectedAt: minutesAgo(25),
  },
  {
    id: 'tower-hvac-night',
    buildingId: 'tower-one',
    title: 'HVAC on full blast in an empty building',
    summary: 'All 10 zones cooling to 68°F. 0 people inside; last badge swipe was 6:58 PM.',
    severity: 'low',
    costAtRisk: 360,
    costAfterFix: 0,
    sources: ['BMS', 'Badge system', 'Lease', 'Smart meter'],
    chain: ['Runs all night (~300 kW × 10 hrs)', '≈ $360 wasted tonight', '≈ $130K wasted per year'],
    fixSteps: ['Switch HVAC to night mode until 7 AM'],
    autoFix: false,
    detectedAt: minutesAgo(40),
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

export function getBuilding(id: string) {
  return BUILDINGS.find((b) => b.id === id);
}

export function getAlert(id: string) {
  return ALERTS.find((a) => a.id === id);
}

/** A building's alerts, most expensive first. */
export function alertsForBuilding(buildingId: string) {
  return ALERTS.filter((a) => a.buildingId === buildingId).sort((a, b) => b.costAtRisk - a.costAtRisk);
}

/** Every alert across the portfolio, most expensive first (for Home). */
export function alertsRankedByCost() {
  return [...ALERTS].sort((a, b) => b.costAtRisk - a.costAtRisk);
}

export function totalCostAtRisk() {
  return ALERTS.reduce((sum, a) => sum + a.costAtRisk, 0);
}

export function isDataCenter(building: Building) {
  return building.type === 'data-center';
}

/** "2026-11-07T..." → "4 min ago" / "3 hr ago". */
export function formatTimeAgo(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.floor(minutes / 60)} hr ago`;
}

/** $240000 → "$240K", 360 → "$360". */
export function formatMoney(amount: number) {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (amount >= 1_000) return `$${Math.round(amount / 1_000)}K`;
  return `$${amount}`;
}
