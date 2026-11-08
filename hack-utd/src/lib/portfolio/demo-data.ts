import type { ActiveAlert, Building, BuildingType, ResolvedIncident, WasteNight } from './types';

/**
 * Demo portfolio: one data center, one mall, one office.
 * Dates are generated relative to "now" so the report always shows recent activity.
 * All numbers are illustrative demo assumptions.
 */

export const ELECTRICITY_PRICE_PER_KWH = 0.12;

export const BUILDINGS: Building[] = [
  {
    id: 'dallas-dc-2',
    name: 'Dallas DC-2',
    type: 'data_center',
    city: 'Dallas, TX',
    tenants: ['Tenant X (cloud hosting, 99.99% uptime SLA)', 'Northwind Analytics'],
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
    tenants: ['Floors 2–7: Contoso Legal (9 AM–6 PM)', 'Floors 8–12: Fabrikam Insurance'],
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
    leasePromise: 'Business-hours comfort',
  },
  mall: {
    outageImpact: 'Medium',
    whatMatters: 'Store hours, sales, food safety',
    leasePromise: 'Open during mall hours',
  },
  data_center: {
    outageImpact: 'Very high',
    whatMatters: 'Uptime, lease penalties, equipment',
    leasePromise: 'Very high uptime (99.99%)',
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
      title: 'Server Room 2 slowly overheating',
      summary:
        'Each reading looked normal, but the trend (78°F, rising 1°F every 10 min) predicted the 90°F danger limit in about 2 hours. Cooling Unit 2 is 18 years old with 4 repairs this year, and servers were at 92% load.',
      occurredAt: daysAgo(now, 3, 23, 10),
      chain: [
        'Panel B voltage dipping',
        'Cooling Unit 2 struggling',
        'Server Room 2 overheats',
        'Tenant X servers go down',
        'Lease penalty + lost business',
      ],
      stoppedAt: 1,
      fix: 'Turned on backup Cooling Unit 4 and shifted 30% of Room 2 server load to Room 3.',
      fixMode: 'one_tap',
      sources: ['Panel sensors', 'HVAC / BMS', 'Temperature sensors', 'Maintenance records', 'Server load', 'Tenant lease'],
      costAvoided: 67000,
    },
    {
      id: 'galleria-panel-b',
      buildingId: 'galleria-mall',
      category: 'power',
      outcome: 'outage_prevented',
      title: 'Panel B showing failure signs before a storm',
      summary:
        'Panel B voltage dropped 8% three times in one day and the panel ran at 140°F. It had not been inspected in 2 years and a storm was forecast that night. Risk score: 100 out of 100.',
      occurredAt: daysAgo(now, 6, 16, 30),
      chain: [
        'Panel B failing',
        'Food court + 14 stores lose power',
        'Stores close, freezers warm up',
        'Lost sales + food spoilage',
      ],
      stoppedAt: 0,
      fix: 'Moved Panel B critical load to the backup feed and sent an electrician, who found and fixed a loose connection.',
      fixMode: 'one_tap',
      sources: ['Panel sensors', 'Maintenance records', 'Weather', 'Tenant lease'],
      costAvoided: 18500,
    },
    {
      id: 'dc2-badge-login',
      buildingId: 'dallas-dc-2',
      category: 'security',
      outcome: 'threat_stopped',
      title: 'After-hours badge swipe + new server login',
      summary:
        'A badge opened the Server Room 1 door at 2:04 AM, and 3 minutes later a new account logged in from a server in that room. Either event alone is minor; together they look like a break-in.',
      occurredAt: daysAgo(now, 9, 2, 4),
      chain: [
        'Badge used at 2:04 AM',
        'New login from that room’s server',
        'Possible data theft',
        'Tenant breach + contract penalties',
      ],
      stoppedAt: 1,
      fix: 'Blocked the login, locked the Room 1 door, and paged security. No one answered in 10 minutes, so it escalated to the backup guard.',
      fixMode: 'escalated',
      sources: ['Badge system', 'Network logs', 'Cameras', 'Tenant lease'],
      costAvoided: 85000,
    },
    {
      id: 'galleria-freezer',
      buildingId: 'galleria-mall',
      category: 'cooling',
      outcome: 'failure_prevented',
      title: 'Food court walk-in freezer warming',
      summary:
        'The freezer compressor started short-cycling overnight and the box warmed from 0°F to 14°F. At that rate it would pass the food-safety limit before the food court opened.',
      occurredAt: daysAgo(now, 12, 5, 40),
      chain: ['Compressor short-cycling', 'Freezer above safe temp', 'Food thrown out', 'Tenant claim + inspection'],
      stoppedAt: 0,
      fix: 'Sent a refrigeration technician before opening. Compressor relay replaced by 8:15 AM.',
      fixMode: 'one_tap',
      sources: ['Temperature sensors', 'Maintenance records', 'Tenant lease'],
      costAvoided: 6200,
    },
    {
      id: 'dc2-ups-not-ready',
      buildingId: 'dallas-dc-2',
      category: 'power',
      outcome: 'outage_prevented',
      title: 'Backup power not ready before a storm',
      summary:
        'UPS battery string B had missed 2 monthly tests and a storm was forecast. The grid flickered for 6 seconds that night, and the repaired UPS carried the load.',
      occurredAt: daysAgo(now, 14, 9, 0),
      chain: ['UPS string B untested', 'Grid flicker during storm', 'Servers lose power', 'Tenant X SLA breach'],
      stoppedAt: 0,
      fix: 'Sent a technician to test the UPS and replace 3 weak battery modules before the storm.',
      fixMode: 'one_tap',
      sources: ['Maintenance records', 'Backup power status', 'Weather', 'Tenant lease'],
      costAvoided: 48000,
    },
    {
      id: 'tower-chiller-3',
      buildingId: 'tower-one',
      category: 'cooling',
      outcome: 'failure_prevented',
      title: 'Chiller #3 wearing out before a heat wave',
      summary:
        'Chiller #3 drew 22% more power to hold the same temperature. It is 18 years old, was repaired 4 times this year, and a 95°F heat wave was forecast.',
      occurredAt: daysAgo(now, 21, 14, 0),
      chain: ['Chiller #3 degrading', 'Chiller trips in 95°F heat', 'Floors 8–12 too hot', 'Tenant complaints + rent credits'],
      stoppedAt: 0,
      fix: 'Booked the repair before the heat wave and pre-cooled Floors 8–12 overnight.',
      fixMode: 'one_tap',
      sources: ['HVAC / BMS', 'Smart meters', 'Maintenance records', 'Weather'],
      costAvoided: 9800,
    },
    {
      id: 'tower-leak-escalation',
      buildingId: 'tower-one',
      category: 'power',
      outcome: 'outage_prevented',
      title: 'Ignored leak alert escalated',
      summary:
        'A leak sensor in the Floor 2 electrical room went wet and the alert sat unacknowledged for 15 minutes. The app escalated it to the next technician on the list.',
      occurredAt: daysAgo(now, 26, 19, 20),
      chain: ['Leak in electrical room', 'Water reaches Panel 2A', 'Floor 2 loses power', 'Tenant downtime'],
      stoppedAt: 0,
      fix: 'Escalated to the backup technician, who shut the valve and dried the room before water reached the panel.',
      fixMode: 'escalated',
      sources: ['Leak sensors', 'Maintenance tickets', 'Panel sensors'],
      costAvoided: 12500,
    },
  ];
}

/** Nightly setbacks: HVAC/lights left on in an empty space, switched off automatically. */
export function buildWasteNights(now: Date, days = 30): WasteNight[] {
  const nights: WasteNight[] = [];
  const rules = [
    // Tower One Floor 4: 85 kW × 7 h (the demo example). Skipped on nights someone worked late.
    { buildingId: 'tower-one', zone: 'Floor 4 HVAC', kw: 85, hours: 7, skip: (i: number) => i % 6 === 2 },
    // Galleria: atrium lights + after-hours HVAC once stores close.
    { buildingId: 'galleria-mall', zone: 'Atrium lights + HVAC', kw: 60, hours: 6, skip: (i: number) => i % 9 === 4 },
    // DC-2 office wing (not the server halls): empty on weekends.
    {
      buildingId: 'dallas-dc-2',
      zone: 'Office wing HVAC',
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
    title: 'Server Room 3 warming under extra load',
    detail:
      'Room 3 took on load from Room 2 and is at 76°F with servers at 88%. A cooling problem plus high load is riskier than either alone.',
    moneyAtRisk: 24000,
    eta: 'in about 3 hours',
    recommendedFix: 'Move load back to Room 2 once Cooling Unit 2 is repaired, or start a portable cooler.',
  },
  {
    id: 'galleria-panel-d',
    buildingId: 'galleria-mall',
    category: 'power',
    severity: 'watch',
    title: 'Panel D running hot (131°F)',
    detail: 'Panel temperature has risen 9°F this week with no change in load.',
    moneyAtRisk: 9500,
    eta: 'within 48 hours',
    recommendedFix: 'Send an electrician for a thermal scan.',
  },
  {
    id: 'tower-floor-7',
    buildingId: 'tower-one',
    category: 'waste',
    severity: 'act',
    title: 'Floor 7 HVAC on with 0 people',
    detail: 'Last badge swipe 6:41 PM, no devices on Wi-Fi, cooling to 70°F.',
    moneyAtRisk: 64,
    eta: 'tonight',
    recommendedFix: 'Auto setback to unoccupied mode (reverts on next badge swipe).',
  },
];

export function getBuilding(id: string) {
  return BUILDINGS.find((b) => b.id === id);
}
