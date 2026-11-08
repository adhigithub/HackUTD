/**
 * Fake building data for the demo. Stands in for the BMS, meters, panel
 * sensors, badge system, maintenance records, leases and weather feed.
 * All $ values are illustrative demo assumptions, not real figures.
 */
import type { PanelSigns } from './engine';
import type { Building, DominoDef, FixDef, Signal } from './types';

export const BUILDINGS: Building[] = [
  { id: 'dallas-dc-2', name: 'Dallas DC-2', type: 'data_center', city: 'Dallas, TX' },
  { id: 'galleria-mall', name: 'Galleria Mall', type: 'mall', city: 'Dallas, TX' },
  { id: 'tower-one', name: 'Tower One', type: 'office', city: 'Richardson, TX' },
];

export function getBuilding(id: string) {
  return BUILDINGS.find((b) => b.id === id);
}

/**
 * Each scenario names the equipment + metric it watches in the `readings`
 * table (Supabase). Whether the alert exists is decided by those readings;
 * the step chains, costs and fixes below are fixed demo values.
 */
export type Sensor = { assetId: string; metric: string };

// ─── Scenario 3: Server Room 2 slowly overheating (Dallas DC-2) ─────────────

export const serverRoomOverheat = {
  id: 'dc2-server-room-2-heat',
  buildingId: 'dallas-dc-2',
  title: 'Server Room 2 is slowly overheating',
  asset: 'Cooling Unit 2',
  location: 'Server Room 2',
  sensor: { assetId: 'room2', metric: 'temp_f' } satisfies Sensor,
  limitF: 90,
  /** Alert when the trend hits the limit within this many minutes. */
  horizonMin: 360,
  signals: [
    { source: 'temp', reading: 'Server Room 2 is 78°F and getting 1°F hotter every 10 minutes' },
    { source: 'bms', reading: 'Cooling Unit 2 is running 40% longer than normal just to keep up' },
    { source: 'maintenance', reading: 'Cooling Unit 2 is 18 years old and was repaired 4 times this year' },
    { source: 'servers', reading: 'Servers in Room 2 are working at 92% capacity, so they run hot' },
    { source: 'lease', reading: 'Tenant X’s contract promises their servers almost never go down' },
  ] satisfies Signal[],
  /** Server Room 2 hits the limit 45 min after Cooling Unit 2 trips. */
  coolingToRoomDelay: 45,
  chain: [
    {
      id: 'cu2',
      icon: '❄️',
      label: 'Cooling Unit 2',
      impact: 'Cooling Unit 2 stops working',
      source: 'bms',
      delayMin: 0, // set from the trend prediction
      cost: 2_000,
      relationToNext: 'cools',
    },
    {
      id: 'room2',
      icon: '🌡️',
      label: 'Server Room 2',
      impact: 'Server Room 2 gets too hot and servers shut down',
      source: 'temp',
      delayMin: 45,
      cost: 15_000,
      relationToNext: 'hosts',
    },
    {
      id: 'tenantx',
      icon: '🏢',
      label: 'Tenant X',
      impact: 'Tenant X’s websites and apps go offline',
      source: 'lease',
      delayMin: 10,
      cost: 50_000,
      relationToNext: 'lease promises 99.99% uptime',
    },
    {
      id: 'penalty',
      icon: '💸',
      label: 'Contract penalty',
      impact: 'We owe Tenant X a penalty for the outage',
      source: 'lease',
      delayMin: 20,
      cost: 40_000,
    },
  ] satisfies DominoDef[],
  fixes: [
    {
      id: 'backup-cooling',
      title: 'Turn on the backup cooling unit',
      detail: 'Start the spare cooling unit for Server Room 2 so Cooling Unit 2 isn’t overworked.',
      mode: 'one_tap',
      stopsAtDominoId: 'cu2',
      effectMin: 5,
      effort: 1,
      notifies: ['Facilities on-call', 'Tenant X account team'],
    },
    {
      id: 'shift-load',
      title: 'Move Tenant X’s computer work to Room 3',
      detail: 'Shift Tenant X’s work to Room 3 before Room 2 gets too hot.',
      mode: 'one_tap',
      stopsAtDominoId: 'tenantx',
      effectMin: 20,
      effort: 2,
      notifies: ['Data center ops', 'Tenant X account team'],
    },
    {
      id: 'dispatch-hvac',
      title: 'Send a cooling technician to Cooling Unit 2',
      detail: 'Send a technician with the unit history and current readings.',
      mode: 'escalate',
      stopsAtDominoId: 'cu2',
      effectMin: 90,
      effort: 3,
      notifies: ['Technician on duty'],
    },
  ] satisfies FixDef[],
};

// ─── Scenario 2: power panel failure signs (same problem, two buildings) ────

/**
 * Warning signs that come from records, not live sensors (repair history and
 * the weather feed). The live ones (voltage dips, panel temperature) are read
 * from the `readings` table at scan time.
 */
export const panelRecordSigns: Pick<PanelSigns, 'inspectionOverdue' | 'stormForecast'> = {
  inspectionOverdue: true,
  stormForecast: true,
};

/** A panel counts as running hot at or above this temperature. */
export const PANEL_HOT_F = 120;

export const panelFailures = [
  {
    id: 'dc2-panel-b',
    assetId: 'panel-b',
    buildingId: 'dallas-dc-2',
    title: 'Panel B is showing failure signs',
    asset: 'Power Panel B',
    location: 'Electrical Room 1',
    signals: [
      { source: 'panel', reading: 'Panel B’s power dipped 3 times today and it’s running hot (140°F)' },
      { source: 'maintenance', reading: 'Panel B hasn’t been inspected in 2 years' },
      { source: 'weather', reading: 'A severe storm is expected in about 3 hours' },
      { source: 'backup', reading: 'Backup generator passed its test 10 days ago' },
      { source: 'lease', reading: 'Tenant X’s contract promises their power almost never goes out' },
    ] satisfies Signal[],
    chain: [
      {
        id: 'panelb',
        icon: '⚡',
        label: 'Panel B',
        impact: 'Power Panel B fails during the storm',
        source: 'panel',
        delayMin: 180,
        cost: 8_000,
        relationToNext: 'powers',
      },
      {
        id: 'cu2',
        icon: '❄️',
        label: 'Cooling Unit 2',
        impact: 'Cooling Unit 2 loses power',
        source: 'bms',
        delayMin: 5,
        cost: 2_000,
        relationToNext: 'cools',
      },
      {
        id: 'room2',
        icon: '🌡️',
        label: 'Server Room 2',
        impact: 'Server Room 2 overheats and servers shut down',
        source: 'temp',
        delayMin: 45,
        cost: 15_000,
        relationToNext: 'hosts',
      },
      {
        id: 'tenantx',
        icon: '🏢',
        label: 'Tenant X',
        impact: 'Tenant X goes offline and we owe a penalty',
        source: 'lease',
        delayMin: 10,
        cost: 90_000,
      },
    ] satisfies DominoDef[],
    fixes: [
      {
        id: 'backup-power',
        title: 'Switch to backup power and send an electrician',
        detail: 'Run the cooling unit and server room on generator power, then have an electrician check Panel B.',
        mode: 'one_tap',
        stopsAtDominoId: 'cu2',
        effectMin: 10,
        effort: 2,
        notifies: ['Electrician on call', 'Facilities on-call', 'Tenant X account team'],
      },
      {
        id: 'dispatch-electrician',
        title: 'Send an electrician to repair Panel B',
        detail: 'Inspect and repair Panel B before the storm arrives.',
        mode: 'escalate',
        stopsAtDominoId: 'panelb',
        effectMin: 120,
        effort: 3,
        notifies: ['Electrician on call'],
      },
    ] satisfies FixDef[],
  },
  {
    id: 'galleria-panel-3',
    assetId: 'panel-3',
    buildingId: 'galleria-mall',
    title: 'Panel 3 is showing failure signs',
    asset: 'Power Panel 3',
    location: 'the East Wing',
    signals: [
      { source: 'panel', reading: 'Panel 3’s power dipped 3 times today and it’s running hot (140°F)' },
      { source: 'maintenance', reading: 'Panel 3 hasn’t been inspected in 2 years' },
      { source: 'weather', reading: 'A severe storm is expected in about 3 hours' },
      { source: 'lease', reading: 'Food court restaurants are open until 9 PM' },
    ] satisfies Signal[],
    chain: [
      {
        id: 'panel3',
        icon: '⚡',
        label: 'Panel 3',
        impact: 'Power Panel 3 fails during the storm',
        source: 'panel',
        delayMin: 180,
        cost: 8_000,
        relationToNext: 'powers',
      },
      {
        id: 'foodcourt',
        icon: '🧊',
        label: 'Food court refrigeration',
        impact: 'Food court fridges warm up and food spoils',
        source: 'temp',
        delayMin: 30,
        cost: 6_000,
        relationToNext: 'serves',
      },
      {
        id: 'stores',
        icon: '🛍️',
        label: 'East wing stores',
        impact: 'East wing stores close early and lose sales',
        source: 'lease',
        delayMin: 15,
        cost: 12_000,
      },
    ] satisfies DominoDef[],
    fixes: [
      {
        id: 'generator',
        title: 'Switch the food court to generator power',
        detail: 'Keep the fridges and east wing lights on generator power through the storm.',
        mode: 'one_tap',
        stopsAtDominoId: 'foodcourt',
        effectMin: 10,
        effort: 2,
        notifies: ['Mall operations', 'Food court tenants'],
      },
      {
        id: 'dispatch-electrician',
        title: 'Send an electrician to repair Panel 3',
        detail: 'Inspect and repair Panel 3 before the storm arrives.',
        mode: 'escalate',
        stopsAtDominoId: 'panel3',
        effectMin: 120,
        effort: 3,
        notifies: ['Electrician on call'],
      },
    ] satisfies FixDef[],
  },
];

// ─── A slower "watch" alert: freezer drifting warm (Galleria Mall) ──────────

export const freezerDrift = {
  id: 'galleria-freezer-f2',
  buildingId: 'galleria-mall',
  title: 'Food court freezer F-2 is warming',
  asset: 'Freezer F-2',
  location: 'the Food Court',
  sensor: { assetId: 'freezer-f2', metric: 'temp_f' } satisfies Sensor,
  limitF: 10,
  horizonMin: 480,
  signals: [
    { source: 'temp', reading: 'Freezer F-2 is 2.8°F and warming 0.3°F every 10 minutes' },
    { source: 'maintenance', reading: 'F-2’s door seal was flagged as worn at its last check' },
    { source: 'lease', reading: 'Lone Star Grill uses this freezer and opens at 10 AM' },
  ] satisfies Signal[],
  chain: [
    {
      id: 'f2',
      icon: '🧊',
      label: 'Freezer F-2',
      impact: 'Freezer F-2 gets too warm to keep food safe',
      source: 'temp',
      delayMin: 0, // set from the trend prediction
      cost: 500,
      relationToNext: 'stores',
    },
    {
      id: 'stock',
      icon: '🥩',
      label: 'Frozen stock',
      impact: 'The frozen food has to be thrown out',
      source: 'maintenance',
      delayMin: 120,
      cost: 4_500,
      relationToNext: 'supplies',
    },
    {
      id: 'grill',
      icon: '🍔',
      label: 'Lone Star Grill',
      impact: 'Lone Star Grill can’t open on time',
      source: 'lease',
      delayMin: 60,
      cost: 3_000,
    },
  ] satisfies DominoDef[],
  fixes: [
    {
      id: 'dispatch-refrigeration',
      title: 'Send a fridge technician to Freezer F-2',
      detail: 'Replace the worn door seal and check the motor.',
      mode: 'escalate',
      stopsAtDominoId: 'f2',
      effectMin: 90,
      effort: 3,
      notifies: ['Technician on duty', 'Lone Star Grill manager'],
    },
    {
      id: 'move-stock',
      title: 'Move the food to backup freezer F-5',
      detail: 'Ask night security to move the frozen food to F-5.',
      mode: 'one_tap',
      stopsAtDominoId: 'stock',
      effectMin: 30,
      effort: 2,
      notifies: ['Night security', 'Lone Star Grill manager'],
    },
  ] satisfies FixDef[],
};

// ─── Scenario 1: HVAC running in an empty building (Tower One) ──────────────

export const emptyFloorHvac = {
  id: 'tower-one-floor-4-hvac',
  buildingId: 'tower-one',
  floor: 'Floor 4',
  assetId: 'f4-ac',
  /** Power (kW) counts as "AC running hard" at 2× its usual level, and at least this much. */
  minOnKw: 25,
  /** Demo assumptions: it's after the tenant's hours, and they open in 7 h. */
  outsideLeaseHours: true,
  hoursUntilOpen: 7,
  pricePerKWh: 0.12,
  /** Readings that don't come from sensors (contract terms). */
  recordSignals: [
    { source: 'lease', reading: 'The tenant’s office hours are 9 AM–6 PM' },
  ] satisfies Signal[],
};

/** Every alert scenario, by id (used to describe fixes in the Client Report). */
export const SCENARIOS = [serverRoomOverheat, ...panelFailures, freezerDrift];

export function getScenario(id: string) {
  return SCENARIOS.find((s) => s.id === id);
}
