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

/** Plain-English name for each data source, for people who don't know "BMS". */
export const SOURCE_LABELS: Record<DataSource, string> = {
  BMS: 'Building controls',
  'Smart meter': 'Electricity meter',
  'Panel sensor': 'Electrical panel sensor',
  'Temp sensor': 'Temperature sensor',
  'Badge system': 'Door badge system',
  Lease: 'Lease records',
  Maintenance: 'Repair records',
  Weather: 'Weather forecast',
  'Battery monitor': 'Backup battery sensor',
  'Network monitor': 'Network monitor',
};

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
  /** What happens if the grid drops right now. Drives the Backup Power card. */
  backup?: BackupDetail;
};

/** UPS battery + generator details, from the battery monitor and maintenance log. */
export type BackupDetail = {
  batteryHealthPct: number;
  /** How long the UPS can carry today's load, in minutes. */
  batteryRuntimeMin: number;
  /** How long it carries the load when healthy, in minutes. */
  ratedRuntimeMin: number;
  /** Seconds from grid loss until the generator takes the load. */
  generatorStartSec: number;
  generatorLastTestDaysAgo: number;
  fuelHours: number;
  /** Outside risk to grid power, e.g. a storm, if any. */
  gridRisk?: string;
};

export type TemperatureReading = {
  label: string; // e.g. "Server Room 2"
  currentF: number;
  dangerF: number; // the line we don't want to cross
  trend: Trend;
  /** °F per hour. Positive = warming. Used for the time-to-danger countdown. */
  ratePerHourF?: number;
  /** When `currentF` was read (ISO). The countdown keeps ticking from here. */
  readAt?: string;
  /** Recent readings, oldest first, for the sparkline. */
  history?: number[];
  /** The alert this reading feeds, so the countdown can show the fastest fix. */
  relatedAlertId?: string;
};

/** Something that happened in a building — one row on the Timeline. */
export type TimelineEvent = {
  id: string;
  at: string; // ISO time
  category: 'power' | 'cooling' | 'weather' | 'people' | 'network';
  title: string;
  detail?: string;
  source?: DataSource;
  /** Person who did it, for human actions (e.g. a shift handoff). */
  who?: string;
  /** Alerts (or linked risks) this event contributed to. */
  relatedTo?: string[];
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
  /** When each `chain` step would happen, e.g. "in ~20 min", "+5 min". */
  chainEta?: string[];
  /** Recommended fix steps, in order. */
  fixSteps: string[];
  /** What the world looks like after the fix — the "if we act now" story. */
  ifFixed?: string[];
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
  /** Non-alert events for the Timeline (power blips, handoffs, weather...). */
  timeline?: TimelineEvent[];
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
    power: {
      currentKw: 4200,
      voltageHealth: 'dipping',
      voltageDipsToday: 3,
      backupPower: 'weak',
      backup: {
        batteryHealthPct: 61,
        batteryRuntimeMin: 4,
        ratedRuntimeMin: 12,
        generatorStartSec: 10,
        generatorLastTestDaysAgo: 41,
        fuelHours: 36,
        gridRisk: 'A big storm is expected around 9 PM, so the power may flicker or go out.',
      },
    },
    temperatures: [
      {
        label: 'Server Room 1',
        currentF: 71,
        dangerF: 80,
        trend: 'steady',
        ratePerHourF: 0,
        history: [71, 71, 70.8, 71, 71.2, 71],
      },
      {
        label: 'Server Room 2',
        currentF: 78,
        dangerF: 80,
        trend: 'rising',
        // 1°F every 10 minutes → crosses 80°F in ~20 minutes.
        ratePerHourF: 6,
        readAt: minutesAgo(0),
        history: [75, 75.4, 76, 76.6, 77.3, 78],
        relatedAlertId: 'dc2-server-room-heat',
      },
      {
        label: 'Battery Room',
        currentF: 74,
        dangerF: 85,
        trend: 'steady',
        ratePerHourF: 0,
        history: [73.6, 74, 74, 73.8, 74, 74],
      },
    ],
    occupancy: { peopleNow: 6, lastBadgeSwipe: minutesAgo(4), openHours: '24/7' },
    security: {
      events: [
        {
          id: 'sec-badge-2am',
          kind: 'physical',
          title: 'Someone used a badge in the middle of the night',
          detail: 'A contractor’s badge (#4471) opened Server Room 2 at 2:04 AM. Nobody had work scheduled there.',
          severity: 'high',
          at: minutesAgo(95),
        },
        {
          id: 'sec-camera',
          kind: 'physical',
          title: 'Security camera stopped recording',
          detail: 'The camera in the Server Room 2 hallway went dark 10 minutes before that badge was used.',
          severity: 'medium',
          at: minutesAgo(105),
        },
        {
          id: 'sec-new-login',
          kind: 'cyber',
          title: 'Someone took full control of a server',
          detail: 'A person sitting at server R2-07 logged in with full control. That has never happened before, and it was 3 minutes after the badge was used.',
          severity: 'critical',
          at: minutesAgo(92),
        },
        {
          id: 'sec-failed-logins',
          kind: 'cyber',
          title: 'Lots of wrong-password attempts',
          detail: 'Someone typed a wrong password 48 times on the internal network in the last hour.',
          severity: 'medium',
          at: minutesAgo(30),
        },
      ],
      linkedRisks: [
        {
          id: 'link-breakin',
          title: 'Possible break-in: a badge used at 2 AM, then someone took control of a server in that same room',
          eventIds: ['sec-camera', 'sec-badge-2am', 'sec-new-login'],
          costAtRisk: 500_000,
          fixSteps: [
            'Turn off badge #4471',
            'Kick that person off server R2-07',
            'Send security team to Server Room 2',
          ],
        },
      ],
    },
    timeline: [
      {
        id: 'tl-handoff',
        at: minutesAgo(180),
        category: 'people',
        title: 'Shift handoff: Jordan → Tom',
        detail: '“Cooling unit 2 sounded rough around 11. Keep an eye on Server Room 2.”',
        who: 'Jordan Ellis',
        relatedTo: ['dc2-server-room-heat'],
      },
      {
        id: 'tl-dip-1',
        at: minutesAgo(60),
        category: 'power',
        title: 'Power flickered for less than a second',
        detail: 'The backup battery kept everything running.',
        source: 'Panel sensor',
        relatedTo: ['dc2-battery'],
      },
      {
        id: 'tl-crac-restart',
        at: minutesAgo(45),
        category: 'cooling',
        title: 'Cooling unit 2 shut off and restarted itself',
        detail: 'It happened 20 seconds after the power flicker.',
        source: 'BMS',
        relatedTo: ['dc2-server-room-heat'],
      },
      {
        id: 'tl-dip-2',
        at: minutesAgo(38),
        category: 'power',
        title: 'Power flickered again',
        source: 'Panel sensor',
        relatedTo: ['dc2-battery'],
      },
      {
        id: 'tl-storm',
        at: minutesAgo(25),
        category: 'weather',
        title: 'Severe storm warning for Dallas County',
        detail: 'Expected around 9 PM.',
        source: 'Weather',
        relatedTo: ['dc2-battery'],
      },
      {
        id: 'tl-dip-3',
        at: minutesAgo(20),
        category: 'power',
        title: 'Power flickered a 3rd time. Backup battery is down to 61% health.',
        source: 'Battery monitor',
        relatedTo: ['dc2-battery'],
      },
      {
        id: 'tl-crac-airflow',
        at: minutesAgo(14),
        category: 'cooling',
        title: 'Cooling unit 2 is blowing 30% less air',
        source: 'BMS',
        relatedTo: ['dc2-server-room-heat'],
      },
      {
        id: 'tl-sr2-77',
        at: minutesAgo(10),
        category: 'cooling',
        title: 'Server Room 2 passes 77°F and is still climbing',
        source: 'Temp sensor',
        relatedTo: ['dc2-server-room-heat'],
      },
    ],
  },
  {
    id: 'galleria-mall',
    name: 'Galleria Mall',
    type: 'mall',
    address: '13350 Dallas Pkwy, Dallas, TX',
    hvac: { status: 'on', setpointF: 72, zonesOn: 18, zonesTotal: 20 },
    power: {
      currentKw: 1800,
      voltageHealth: 'dipping',
      voltageDipsToday: 5,
      backupPower: 'ready',
      backup: {
        batteryHealthPct: 94,
        batteryRuntimeMin: 14,
        ratedRuntimeMin: 15,
        generatorStartSec: 8,
        generatorLastTestDaysAgo: 6,
        fuelHours: 24,
      },
    },
    temperatures: [
      { label: 'Food court', currentF: 73, dangerF: 85, trend: 'steady' },
      { label: 'Grocery freezer', currentF: 2, dangerF: 10, trend: 'steady' },
    ],
    occupancy: { peopleNow: 2140, lastBadgeSwipe: minutesAgo(1), openHours: '10 AM – 9 PM' },
    timeline: [
      {
        id: 'tl-mall-maint',
        at: minutesAgo(300),
        category: 'people',
        title: 'Panel E inspection pushed to next week',
        detail: 'Vendor rescheduled.',
        source: 'Maintenance',
        relatedTo: ['mall-lights'],
      },
      {
        id: 'tl-mall-dips',
        at: minutesAgo(120),
        category: 'power',
        title: 'Electrical panel E: power flickered for the 5th time today',
        source: 'Panel sensor',
        relatedTo: ['mall-lights'],
      },
      {
        id: 'tl-mall-heat',
        at: minutesAgo(40),
        category: 'power',
        title: 'Electrical panel E is running hot (140°F)',
        source: 'Panel sensor',
        relatedTo: ['mall-lights'],
      },
    ],
  },
  {
    id: 'tower-one',
    name: 'Tower One',
    type: 'office',
    address: '500 N Akard St, Dallas, TX',
    hvac: { status: 'on', setpointF: 68, zonesOn: 10, zonesTotal: 10 },
    power: {
      currentKw: 300,
      voltageHealth: 'normal',
      voltageDipsToday: 0,
      backupPower: 'ready',
      backup: {
        batteryHealthPct: 98,
        batteryRuntimeMin: 30,
        ratedRuntimeMin: 30,
        generatorStartSec: 12,
        generatorLastTestDaysAgo: 12,
        fuelHours: 48,
      },
    },
    temperatures: [{ label: 'Floor 4', currentF: 68, dangerF: 90, trend: 'steady' }],
    occupancy: { peopleNow: 0, lastBadgeSwipe: minutesAgo(285), openHours: '9 AM – 6 PM' },
    timeline: [
      {
        id: 'tl-tower-last-out',
        at: minutesAgo(285),
        category: 'people',
        title: 'Last person badged out',
        source: 'Badge system',
        relatedTo: ['tower-hvac-night'],
      },
      {
        id: 'tl-tower-hvac',
        at: minutesAgo(60),
        category: 'cooling',
        title: 'Air conditioning still running on all 10 floors',
        source: 'BMS',
        relatedTo: ['tower-hvac-night'],
      },
    ],
  },
];

// ─── Alerts (kept separate so Home can rank them across all buildings) ──────

export const ALERTS: Alert[] = [
  {
    id: 'dc2-battery',
    buildingId: 'dallas-dc-2',
    title: 'Backup battery is getting weak',
    summary: 'Backup battery B is at 61% health and the power flickered 3 times today. A storm is due tonight.',
    severity: 'critical',
    costAtRisk: 240_000,
    costAfterFix: 12_000,
    sources: ['Battery monitor', 'Panel sensor', 'Weather', 'Lease'],
    chain: [
      'Power flickers during tonight’s storm',
      'The weak backup battery can’t keep things running',
      'Cooling shuts off',
      'Server Room 2 overheats past 80°F',
      'Servers crash and customers’ websites and apps go down',
    ],
    chainEta: ['~9 PM tonight', '+1 sec', '+4 min', '+20 min', '+35 min'],
    fixSteps: [
      'Test the generator now',
      'Switch Server Room 2 to backup cooling',
      'Send a technician to replace backup battery B',
    ],
    ifFixed: [
      'Generator confirmed. It takes over in 10 seconds if the grid drops.',
      'Server Room 2 stays cool on backup through the storm',
      'Bank B is replaced by morning and the uptime promise holds',
    ],
    autoFix: true,
    detectedAt: minutesAgo(12),
  },
  {
    id: 'dc2-server-room-heat',
    buildingId: 'dallas-dc-2',
    title: 'Server Room 2 heating up',
    summary: 'Warming 1°F every 10 minutes. It will be too hot (80°F) in about 20 minutes.',
    severity: 'high',
    costAtRisk: 90_000,
    costAfterFix: 0,
    sources: ['Temp sensor', 'BMS'],
    chain: ['Room goes past 80°F', 'Servers slow down to protect themselves', 'Servers shut off and customers notice'],
    chainEta: ['in ~20 min', '+5 min', '+15 min'],
    fixSteps: ['Turn on the spare cooling unit (CRAC-4)', 'Send a technician to check cooling unit 2'],
    ifFixed: [
      'The spare cooling unit brings the room back under 75°F in ~15 min',
      'Servers keep running at full speed. Customers never notice.',
      'Cooling unit 2 gets repaired during the day',
    ],
    autoFix: true,
    detectedAt: minutesAgo(8),
  },
  {
    id: 'mall-lights',
    buildingId: 'galleria-mall',
    title: 'Lights flickering in east wing',
    summary: 'Electrical panel E flickered 5 times today and is running hot (140°F).',
    severity: 'medium',
    costAtRisk: 5_000,
    costAfterFix: 300,
    sources: ['Panel sensor', 'Maintenance', 'Lease'],
    chain: ['Panel E fails', 'East wing loses power', 'Stores close, grocery freezers warm up'],
    chainEta: ['within days', 'right after', 'within 1 hr'],
    fixSteps: ['Book an electrician for Panel E', 'Move grocery freezers to backup circuit'],
    ifFixed: [
      'Panel E is replaced before it fails',
      'East wing stays lit and stores stay open',
      'Freezers stay cold on the backup circuit',
    ],
    autoFix: false,
    detectedAt: minutesAgo(25),
  },
  {
    id: 'tower-hvac-night',
    buildingId: 'tower-one',
    title: 'Air conditioning on full blast in an empty building',
    summary: 'All 10 floors are being cooled to 68°F, but nobody has been inside since 6:58 PM.',
    severity: 'low',
    costAtRisk: 360,
    costAfterFix: 0,
    sources: ['BMS', 'Badge system', 'Lease', 'Smart meter'],
    chain: ['Runs all night for nobody', '≈ $360 wasted tonight', '≈ $130K wasted per year'],
    chainEta: ['tonight', 'by 7 AM', 'over a year'],
    fixSteps: ['Switch the air conditioning to night mode until 7 AM'],
    ifFixed: [
      'The building warms gently to 78°F overnight',
      'Back to 68°F before anyone arrives at 8 AM',
      '≈ $130K saved per year',
    ],
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
export function formatTimeAgo(iso: string, now = Date.now()) {
  const minutes = Math.round((now - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.floor(minutes / 60)} hr ago`;
}

/** ISO → "2:14 AM". */
export function formatClock(iso: string | number) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/** $240000 → "$240K", 360 → "$360". */
export function formatMoney(amount: number) {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (amount >= 1_000) return `$${Math.round(amount / 1_000)}K`;
  return `$${amount}`;
}
