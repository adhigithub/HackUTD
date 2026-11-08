/**
 * Keeps the Data tab in sync with the alerts system: the same sensor readings
 * (from Supabase, or the built-in demo rows offline) and the same open alerts
 * as Home. Readings the backend doesn't have keep the Data tab's demo values.
 */
import { useCallback, useMemo } from 'react';

import type {
  Alert as DataAlert,
  Building as DataBuilding,
  DataSource as DataTabSource,
  PowerReading,
  Severity,
  TemperatureReading,
} from '@/data/buildings';

import { useAlerts } from './alerts-context';
import { fitLine } from './engine';
import { formatMinutes } from './format';
import { emptyFloorHvac, freezerDrift, PANEL_HOT_F, serverRoomOverheat } from './mock-data';
import { ReadingStore } from './readings';
import type { Alert, SourceSystem } from './types';

const SOURCE: Record<SourceSystem, DataTabSource> = {
  bms: 'BMS',
  meter: 'Smart meter',
  panel: 'Panel sensor',
  temp: 'Temp sensor',
  occupancy: 'Badge system',
  maintenance: 'Maintenance',
  lease: 'Lease',
  weather: 'Weather',
  servers: 'Network monitor',
  backup: 'Battery monitor',
};

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * A temperature card filled from live readings (or left as-is if there are none).
 * If its alert was fixed, the fix (e.g. backup cooling) has stopped the rise, so it
 * shows as holding steady instead of "getting too hot".
 */
function liveTemp(
  store: ReadingStore,
  assetId: string,
  base: TemperatureReading,
  extra: Partial<TemperatureReading>,
  fixed: boolean
): TemperatureReading {
  const latest = store.latest(assetId, 'temp_f', 7 * 24 * 60);
  if (!latest) return base;
  const series = store.series(assetId, 'temp_f');
  const ratePerHourF = fixed ? 0 : series.length >= 2 ? fitLine(series).slope * 60 : 0;
  return {
    ...base,
    ...extra,
    currentF: round1(latest.value),
    readAt: new Date(latest.t).toISOString(),
    history: series.map((r) => round1(r.value)),
    ratePerHourF,
    trend: ratePerHourF > 0.5 ? 'rising' : ratePerHourF < -0.5 ? 'falling' : 'steady',
  };
}

/**
 * Power card. With live data, the database decides: panel temperature + dips set
 * the voltage health, and backup equipment (not tracked in the database) shows as
 * healthy, so nothing looks broken unless a reading says so. Offline keeps the demo story.
 */
function livePower(
  store: ReadingStore,
  panelId: string,
  base: PowerReading,
  live: boolean,
  fixed: boolean
): PowerReading {
  const temp = store.latest(panelId, 'temp_f', 7 * 24 * 60);
  const dips = store.count(panelId, 'voltage_dip_pct', (v) => v >= 5);
  if (!live && !temp && !dips) return base;
  // The panel fix moves critical load onto backup power, so the building is safe on backup.
  if (fixed) return { ...base, voltageDipsToday: dips, voltageHealth: 'normal', backupPower: 'active' };
  return {
    ...base,
    voltageDipsToday: dips,
    voltageHealth: temp && temp.value >= PANEL_HOT_F ? 'critical' : dips >= 3 ? 'dipping' : 'normal',
    ...(live && {
      backupPower: 'ready' as const,
      backup: base.backup && {
        ...base.backup,
        batteryHealthPct: Math.max(base.backup.batteryHealthPct, 95),
        batteryRuntimeMin: base.backup.ratedRuntimeMin,
        generatorLastTestDaysAgo: Math.min(base.backup.generatorLastTestDaysAgo, 10),
        gridRisk: undefined,
      },
    }),
  };
}

function toDataAlert(a: Alert): DataAlert {
  const best = a.fixes.find((f) => f.feasible);
  const severity: Severity = a.severity === 'act' ? (a.costAtRisk >= 50_000 ? 'critical' : 'high') : 'medium';
  return {
    id: a.id,
    buildingId: a.buildingId,
    title: a.title,
    summary: a.explanation,
    severity,
    costAtRisk: a.costAtRisk,
    costAfterFix: best ? a.costAtRisk - best.saved : a.costAtRisk,
    sources: [...new Set(a.signals.map((s) => SOURCE[s.source]))],
    chain: a.chain.map((d) => d.impact),
    chainEta: a.chain.map((d) => `in ~${formatMinutes(d.fallAtMin)}`),
    fixSteps: best ? [best.title, best.detail] : ['Call the on-site team now'],
    autoFix: false,
    detectedAt: new Date(a.detectedAt).toISOString(),
  };
}

export function useLiveDataTab() {
  const { readings, scannedAt, openAlerts, resolutions, autoFixes, dataSource } = useAlerts();
  const live = dataSource === 'live';
  /** True if this alert was fixed (and no newer bad reading has reopened it). */
  const isFixed = useCallback((alertId: string) => !!resolutions[alertId], [resolutions]);
  const store = useMemo(() => new ReadingStore(readings, scannedAt ?? 0), [readings, scannedAt]);

  /** The Data tab's building, with live readings filled in where we have them. */
  const liveBuilding = useCallback(
    (b: DataBuilding): DataBuilding => {
      switch (b.id) {
        case 'dallas-dc-2':
          return {
            ...b,
            power: livePower(store, 'panel-b', b.power, live, isFixed('dc2-panel-b')),
            temperatures: b.temperatures.map((t) =>
              t.label === serverRoomOverheat.location
                ? liveTemp(
                    store,
                    serverRoomOverheat.sensor.assetId,
                    t,
                    { dangerF: serverRoomOverheat.limitF, relatedAlertId: serverRoomOverheat.id },
                    isFixed(serverRoomOverheat.id)
                  )
                : t
            ),
          };
        case 'galleria-mall':
          return {
            ...b,
            power: livePower(store, 'panel-3', b.power, live, isFixed('galleria-panel-3')),
            temperatures: b.temperatures.map((t) =>
              t.label === 'Grocery freezer'
                ? liveTemp(
                    store,
                    freezerDrift.sensor.assetId,
                    t,
                    { label: freezerDrift.asset, dangerF: freezerDrift.limitF, relatedAlertId: freezerDrift.id },
                    isFixed(freezerDrift.id)
                  )
                : t
            ),
          };
        case 'tower-one': {
          const people = store.latest(emptyFloorHvac.assetId, 'people', 7 * 24 * 60);
          const kw = store.latest(emptyFloorHvac.assetId, 'kw', 7 * 24 * 60);
          const autoFixed = autoFixes.some((f) => f.id === emptyFloorHvac.id && !f.undone);
          const running = !!kw && kw.value >= emptyFloorHvac.minOnKw;
          return {
            ...b,
            power: live ? { ...b.power, voltageHealth: 'normal', backupPower: 'ready' } : b.power,
            occupancy: people ? { ...b.occupancy, peopleNow: Math.round(people.value) } : b.occupancy,
            // AC: auto-fixed → night mode; running hard → on; otherwise (live) it's idling in night mode.
            hvac: autoFixed
              ? { ...b.hvac, status: 'night-mode' }
              : running
                ? { ...b.hvac, status: 'on' }
                : live
                  ? { ...b.hvac, status: 'night-mode' }
                  : b.hvac,
          };
        }
        default:
          return b;
      }
    },
    [store, autoFixes, live, isFixed]
  );

  /** The same open alerts as Home, for one building, in the Data tab's format. */
  const liveAlerts = useCallback(
    (buildingId: string) => openAlerts.filter((a) => a.buildingId === buildingId).map(toDataAlert),
    [openAlerts]
  );

  return { liveBuilding, liveAlerts };
}
