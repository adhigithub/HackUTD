import type { ActiveAlert, Building, BuildingType, ResolvedIncident, WasteNight } from './types';

/**
 * Demo portfolio: one data center, one mall, one office.
 * Dates are generated relative to "now" so the report always shows recent activity.
 * All numbers are illustrative demo assumptions.
 *
 * Wording is written for people new to buildings (e.g. hackathon judges):
 * everyday words first, technical names only where they help.
 */

export const ELECTRICITY_PRICE_PER_KWH = 0.12;

export const BUILDINGS: Building[] = [
  {
    id: 'dallas-dc-2',
    name: 'Dallas DC-2',
    type: 'data_center',
    city: 'Dallas, TX',
    tenants: ['Tenant X (cloud hosting, promised 99.99% uptime)', 'Northwind Analytics'],
  },
  {
    id: 'galleria-mall',
    name: 'Galleria Mall',
    type: 'mall',
    city: 'Dallas, TX',
    tenants: ['Food court (14 vendors)', '120 retail stores', 'Anchor department store'],
  },
  {
    id: 'tower-one',
    name: 'Tower One',
    type: 'office',
    city: 'Plano, TX',
    tenants: ['Floors 2–7: Contoso Legal (open 9 AM–6 PM)', 'Floors 8–12: Fabrikam Insurance'],
  },
];

/** What a 10-minute power loss means by building type (from the app description). */
export const IMPACT_PROFILES: Record<
  BuildingType,
  { outageImpact: 'Low' | 'Medium' | 'Very high'; whatMatters: string; leasePromise: string }
> = {
  office: {
    outageImpact: 'Low',
    whatMatters: 'Comfort and energy cost',
    leasePromise: 'Comfortable during business hours',
  },
  mall: {
    outageImpact: 'Medium',
    whatMatters: 'Store hours, sales, food safety',
    leasePromise: 'Open during mall hours',
  },
  data_center: {
    outageImpact: 'Very high',
    whatMatters: 'Staying online, contract penalties, equipment',
    leasePromise: 'Online 99.99% of the time',
  },
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** ISO timestamp `days` days before `now`, at the given local hour/minute. */
function daysAgo(now: Date, days: number, hour: number, minute = 0) {
  const d = new Date(now.getTime() - days * DAY_MS);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export function buildIncidents(now: Date): ResolvedIncident[] {
  return [
    {
      id: 'dc2-server-room-2-heat',
      buildingId: 'dallas-dc-2',
      category: 'cooling',
      outcome: 'outage_prevented',
      title: 'Server room slowly overheating',
      summary:
        'Server Room 2 was 78°F and warming 1°F every 10 minutes. Each reading looked fine, but the trend meant it would hit the 90°F danger point in about 2 hours. Its cooling unit is 18 years old and was repaired 4 times this year.',
      occurredAt: daysAgo(now, 3, 23, 10),
      chain: [
        'Power box voltage dipping',
        'Cooling unit struggling',
        'Server room overheats',
        'Tenant X’s computers shut down',
        'Contract penalty + lost business',
      ],
      stoppedAt: 1,
      fix: 'Turned on a backup cooling unit and moved some computer work to another room.',
      fixMode: 'one_tap',
      sources: ['Power sensors', 'Cooling system', 'Temperature sensors', 'Repair history', 'Server workload', 'Tenant contract'],
      costAvoided: 67000,
    },
    {
      id: 'galleria-panel-b',
      buildingId: 'galleria-mall',
      category: 'power',
      outcome: 'outage_prevented',
      title: 'Power box about to fail before a storm',
      summary:
        'An electrical panel (the box that sends power to the food court) had 3 voltage drops in one day and was running hot at 140°F. It hadn’t been inspected in 2 years, and a storm was coming that night.',
      occurredAt: daysAgo(now, 6, 16, 30),
      chain: [
        'Power box failing',
        'Food court + 14 stores lose power',
        'Stores close, freezers warm up',
        'Lost sales + spoiled food',
      ],
      stoppedAt: 0,
      fix: 'Switched the important equipment to backup power and sent an electrician, who fixed a loose wire.',
      fixMode: 'one_tap',
      sources: ['Power sensors', 'Repair history', 'Weather', 'Tenant contract'],
      costAvoided: 18500,
    },
    {
      id: 'dc2-badge-login',
      buildingId: 'dallas-dc-2',
      category: 'security',
      outcome: 'threat_stopped',
      title: 'Someone entered the server room at 2 AM',
      summary:
        'A key card opened the server room door at 2:04 AM, and 3 minutes later a new account logged into a computer in that room. Each event alone is minor. Together, they look like a break-in.',
      occurredAt: daysAgo(now, 9, 2, 4),
      chain: [
        'Key card used at 2:04 AM',
        'Unknown login on a server',
        'Customer data stolen',
        'Data breach + contract penalties',
      ],
      stoppedAt: 1,
      fix: 'Blocked the login, locked the door, and alerted security. No one answered in 10 minutes, so it alerted the backup guard.',
      fixMode: 'escalated',
      sources: ['Key card system', 'Network logs', 'Cameras', 'Tenant contract'],
      costAvoided: 85000,
    },
    {
      id: 'galleria-freezer',
      buildingId: 'galleria-mall',
      category: 'cooling',
      outcome: 'failure_prevented',
      title: 'Food court freezer warming up',
      summary:
        'The walk-in freezer’s motor kept switching on and off overnight, and it warmed from 0°F to 14°F. At that rate, the food would be unsafe before the food court opened.',
      occurredAt: daysAgo(now, 12, 5, 40),
      chain: ['Freezer motor failing', 'Freezer too warm', 'Food thrown out', 'Tenant claim + health inspection'],
      stoppedAt: 0,
      fix: 'Sent a repair technician before opening. Fixed by 8:15 AM.',
      fixMode: 'one_tap',
      sources: ['Temperature sensors', 'Repair history', 'Tenant contract'],
      costAvoided: 6200,
    },
    {
      id: 'dc2-ups-not-ready',
      buildingId: 'dallas-dc-2',
      category: 'power',
      outcome: 'outage_prevented',
      title: 'Backup batteries not ready before a storm',
      summary:
        'The backup batteries that keep servers running during a blackout had skipped 2 monthly tests, and a storm was coming. That night the power flickered for 6 seconds, and the repaired batteries kept everything running.',
      occurredAt: daysAgo(now, 14, 9, 0),
      chain: ['Backup batteries untested', 'Power flickers in storm', 'Servers lose power', 'Broken 99.99% uptime promise'],
      stoppedAt: 0,
      fix: 'Sent a technician to test the batteries and replace 3 weak ones before the storm.',
      fixMode: 'one_tap',
      sources: ['Repair history', 'Backup power status', 'Weather', 'Tenant contract'],
      costAvoided: 48000,
    },
    {
      id: 'tower-chiller-3',
      buildingId: 'tower-one',
      category: 'cooling',
      outcome: 'failure_prevented',
      title: 'AC unit wearing out before a heat wave',
      summary:
        'The building’s main AC unit (Chiller #3) was using 22% more power to keep the same temperature, a sign it was wearing out. It is 18 years old, was repaired 4 times this year, and a 95°F heat wave was coming.',
      occurredAt: daysAgo(now, 21, 14, 0),
      chain: ['AC unit wearing out', 'AC breaks in 95°F heat', 'Floors 8–12 too hot', 'Tenant complaints + rent refunds'],
      stoppedAt: 0,
      fix: 'Booked the repair before the heat wave and pre-cooled Floors 8–12 overnight.',
      fixMode: 'one_tap',
      sources: ['Cooling system', 'Electric meters', 'Repair history', 'Weather'],
      costAvoided: 9800,
    },
    {
      id: 'tower-leak-escalation',
      buildingId: 'tower-one',
      category: 'power',
      outcome: 'outage_prevented',
      title: 'Ignored water leak alert',
      summary:
        'A water sensor went off in the Floor 2 electrical room, and nobody responded for 15 minutes. The app automatically passed the alert to the next technician on the list.',
      occurredAt: daysAgo(now, 26, 19, 20),
      chain: ['Water leak near electrical room', 'Water reaches power box', 'Floor 2 loses power', 'Tenant can’t work'],
      stoppedAt: 0,
      fix: 'The backup technician shut off the water and dried the room before it reached the power box.',
      fixMode: 'escalated',
      sources: ['Water sensors', 'Repair tickets', 'Power sensors'],
      costAvoided: 12500,
    },
  ];
}

/** Nightly setbacks: AC/lights left on in an empty space, switched off automatically. */
export function buildWasteNights(now: Date, days = 30): WasteNight[] {
  const nights: WasteNight[] = [];
  const rules = [
    // Tower One Floor 4: 85 kW × 7 h (the demo example). Skipped on nights someone worked late.
    { buildingId: 'tower-one', zone: 'Floor 4 AC', kw: 85, hours: 7, skip: (i: number) => i % 6 === 2 },
    // Galleria: lobby lights + AC once stores close.
    { buildingId: 'galleria-mall', zone: 'Lobby lights + AC', kw: 60, hours: 6, skip: (i: number) => i % 9 === 4 },
    // DC-2 office wing (not the server halls): empty on weekends.
    {
      buildingId: 'dallas-dc-2',
      zone: 'Office wing AC',
      kw: 20,
      hours: 8,
      skip: (_i: number, day: number) => day !== 0 && day !== 6,
    },
  ];

  for (let i = 1; i <= days; i++) {
    const date = daysAgo(now, i, 19, 30);
    const day = new Date(date).getDay();
    for (const r of rules) {
      if (r.skip(i, day)) continue;
      const kwh = r.kw * r.hours;
      nights.push({
        buildingId: r.buildingId,
        zone: r.zone,
        date,
        kwhSaved: kwh,
        costSaved: Math.round(kwh * ELECTRICITY_PRICE_PER_KWH * 100) / 100,
      });
    }
  }
  return nights;
}

export const ACTIVE_ALERTS: ActiveAlert[] = [
  {
    id: 'dc2-room-3-load',
    buildingId: 'dallas-dc-2',
    category: 'cooling',
    severity: 'watch',
    title: 'Another server room is warming up',
    detail:
      'Server Room 3 took on extra work from Room 2 and is now 76°F with its servers 88% busy. Heat plus heavy work is riskier than either one alone.',
    moneyAtRisk: 24000,
    eta: 'in about 3 hours',
    recommendedFix: 'Move the work back to Room 2 once its cooling is repaired, or bring in a portable cooler.',
  },
  {
    id: 'galleria-panel-d',
    buildingId: 'galleria-mall',
    category: 'power',
    severity: 'watch',
    title: 'A power box is running hot (131°F)',
    detail: 'Its temperature rose 9°F this week even though it isn’t carrying more power.',
    moneyAtRisk: 9500,
    eta: 'within 48 hours',
    recommendedFix: 'Send an electrician to check it with a heat camera.',
  },
  {
    id: 'tower-floor-7',
    buildingId: 'tower-one',
    category: 'waste',
    severity: 'act',
    title: 'AC running on an empty floor',
    detail: 'Floor 7 has been empty since 6:41 PM, but the AC is still cooling it to 70°F.',
    moneyAtRisk: 64,
    eta: 'tonight',
    recommendedFix: 'The app will switch it to night mode automatically. It turns back on when someone badges in.',
  },
];

export function getBuilding(id: string) {
  return BUILDINGS.find((b) => b.id === id);
}
