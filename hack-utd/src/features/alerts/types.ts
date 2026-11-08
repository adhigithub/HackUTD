export type BuildingType = 'data_center' | 'mall' | 'office';

export type Building = {
  id: string;
  name: string;
  type: BuildingType;
  city: string;
};

export const BUILDING_TYPE_LABELS: Record<BuildingType, string> = {
  data_center: 'Data center',
  mall: 'Shopping mall',
  office: 'Office',
};

/** The building systems BluePrint connects. Every signal and domino says where it came from. */
export type SourceSystem =
  | 'bms'
  | 'meter'
  | 'panel'
  | 'temp'
  | 'occupancy'
  | 'maintenance'
  | 'lease'
  | 'weather'
  | 'servers'
  | 'backup';

/** Plain-English names for each building system (no jargon like "BMS"). */
export const SOURCE_LABELS: Record<SourceSystem, string> = {
  bms: 'Heating & cooling system',
  meter: 'Power meter',
  panel: 'Electrical panel sensors',
  temp: 'Temperature sensors',
  occupancy: 'Badge swipes & Wi-Fi',
  maintenance: 'Repair records',
  lease: 'Tenant contract',
  weather: 'Weather forecast',
  servers: 'Server monitoring',
  backup: 'Backup generator',
};

export type Signal = { source: SourceSystem; reading: string };

/** One domino as defined in building data (before the engine adds timing). */
export type DominoDef = {
  id: string;
  icon: string;
  label: string;
  /** What happens to this piece of the building when it falls. */
  impact: string;
  source: SourceSystem;
  /** Minutes after the previous domino falls (first domino: after detection). */
  delayMin: number;
  /** $ lost if this domino falls. Illustrative demo values. */
  cost: number;
  /** How this domino connects to the next one, e.g. "powers". */
  relationToNext?: string;
};

/** A domino after the engine has walked the chain. */
export type Domino = DominoDef & {
  /** Minutes after detection that this domino falls if nothing is done. */
  fallAtMin: number;
  /** $ lost by the time this domino has fallen (this one + everything before). */
  cumulativeCost: number;
};

export type FixMode = 'auto' | 'one_tap' | 'escalate';

export const FIX_MODE_LABELS: Record<FixMode, string> = {
  auto: 'Automatic',
  one_tap: 'One tap',
  escalate: 'Escalate',
};

export type FixDef = {
  id: string;
  title: string;
  detail: string;
  mode: FixMode;
  /** The fix protects this domino and everything after it. */
  stopsAtDominoId: string;
  /** Minutes until the fix takes effect. */
  effectMin: number;
  /** 1 = trivial, 3 = truck roll / big operational change. */
  effort: 1 | 2 | 3;
  /** Who gets notified when this fix is applied. */
  notifies: string[];
};

export type ScoredFix = FixDef & {
  /** Fix lands before its domino falls. */
  feasible: boolean;
  /** $ protected by stopping the chain here (0 if infeasible). */
  saved: number;
  score: number;
};

export type AlertKind = 'overheat' | 'power' | 'waste';
export type Severity = 'act' | 'watch';

export type Alert = {
  id: string;
  buildingId: string;
  kind: AlertKind;
  title: string;
  /** The thing that breaks first, e.g. "Cooling Unit 2". */
  asset: string;
  /** Where it is, e.g. "Server Room 2". */
  location: string;
  severity: Severity;
  /** Epoch ms when the scan flagged this. Timers count from here. */
  detectedAt: number;
  /**
   * Epoch ms of the newest sensor reading behind this alert. A fix only covers
   * readings up to the moment it was applied; a newer bad reading reopens the alert.
   */
  dataAt: number;
  /** The headline number from the detection rule, e.g. "Risk score 100/100". */
  metric: string;
  signals: Signal[];
  chain: Domino[];
  /** Total $ if every domino falls. */
  costAtRisk: number;
  /** Fixes, best first. fixes[0] is the recommendation when feasible. */
  fixes: ScoredFix[];
  /** Mock-AI generated plain-English explanation. */
  explanation: string;
  /** Mock-AI confidence, 0–1. */
  confidence: number;
};

export type AutoFix = {
  id: string;
  buildingId: string;
  title: string;
  detail: string;
  /** Wall-clock label, e.g. "11:42 PM". */
  at: string;
  savedPerNight: number;
  savedPerYear: number;
  signals: Signal[];
  undone: boolean;
};

export type Resolution = {
  alertId: string;
  fixId: string;
  saved: number;
  byName: string;
  at: number;
  notified: string[];
};
