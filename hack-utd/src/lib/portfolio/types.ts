/**
 * Shared shapes for the demo portfolio. Every screen (Home, Data, Report, Ask AI)
 * should read from these so the numbers agree everywhere.
 *
 * All dollar figures are illustrative demo values, not real client data.
 */

export type BuildingType = 'data_center' | 'mall' | 'office';

export const BUILDING_TYPE_LABELS: Record<BuildingType, string> = {
  data_center: 'Data center',
  mall: 'Shopping mall',
  office: 'Office',
};

export type Building = {
  id: string;
  name: string;
  type: BuildingType;
  city: string;
  tenants: string[];
};

export type IssueCategory = 'cooling' | 'power' | 'security' | 'waste';

export const CATEGORY_LABELS: Record<IssueCategory, string> = {
  cooling: 'Cooling & temperature',
  power: 'Power',
  security: 'Security',
  waste: 'Overnight waste',
};

/** How a fix was carried out (see the safety rules in the app description). */
export type FixMode = 'auto' | 'one_tap' | 'escalated';

export const FIX_MODE_LABELS: Record<FixMode, string> = {
  auto: 'Auto-fixed',
  one_tap: 'One-tap fix',
  escalated: 'Escalated',
};

export type IncidentOutcome = 'outage_prevented' | 'failure_prevented' | 'threat_stopped';

/** A problem the app caught and stopped before it spread. */
export type ResolvedIncident = {
  id: string;
  buildingId: string;
  category: IssueCategory;
  outcome: IncidentOutcome;
  title: string;
  /** Plain-English explanation of what the connected data showed. */
  summary: string;
  occurredAt: string; // ISO
  /** The dominoes, in the order they would have fallen. */
  chain: string[];
  /** Index into `chain` of the domino where the fix stopped the spread. */
  stoppedAt: number;
  fix: string;
  fixMode: FixMode;
  /** Systems whose data was combined to catch this. */
  sources: string[];
  /** Estimated cost if the chain had kept falling (illustrative). */
  costAvoided: number;
};

/** One night where the app put an empty space into setback mode automatically. */
export type WasteNight = {
  buildingId: string;
  zone: string;
  date: string; // ISO, evening the setback started
  kwhSaved: number;
  costSaved: number;
};

export type AlertSeverity = 'watch' | 'act';

/** Open problem that still has money at risk. */
export type ActiveAlert = {
  id: string;
  buildingId: string;
  category: IssueCategory;
  severity: AlertSeverity;
  title: string;
  detail: string;
  moneyAtRisk: number;
  /** When it is expected to get worse, in words. */
  eta: string;
  recommendedFix: string;
};
