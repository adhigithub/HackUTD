/**
 * Turns what happened in the alerts system (fixes people approved, and the
 * overnight AC auto-fix) into Client Report entries, so a fix shows up in the
 * Report right away. Fixes saved in Supabase show up on every phone.
 */
import { useMemo } from 'react';

import type { LiveReportEntries } from '@/lib/portfolio/report';
import type { ActiveAlert, ResolvedIncident, WasteNight } from '@/lib/portfolio/types';

import { useAlerts } from './alerts-context';
import { formatMinutes } from './format';
import { emptyFloorHvac, getScenario } from './mock-data';
import { SOURCE_LABELS, type Alert, type AlertKind, type FixMode, type Resolution } from './types';

const CATEGORY: Record<AlertKind, ResolvedIncident['category']> = {
  overheat: 'cooling',
  power: 'power',
  waste: 'waste',
};

const OUTCOME: Record<AlertKind, ResolvedIncident['outcome']> = {
  overheat: 'failure_prevented',
  power: 'outage_prevented',
  waste: 'failure_prevented',
};

const MODE: Record<FixMode, ResolvedIncident['fixMode']> = {
  auto: 'auto',
  one_tap: 'one_tap',
  escalate: 'escalated',
};

function toIncident(r: Resolution, alert: Alert | undefined): ResolvedIncident | null {
  // Prefer the live alert; fall back to the scenario definition if the data has
  // since gone back to normal (the alert no longer exists, but the fix did happen).
  const scenario = getScenario(r.alertId);
  if (!alert && !scenario) return null;
  const chainDefs = alert?.chain ?? scenario!.chain;
  const fixes = alert?.fixes ?? scenario!.fixes;
  const fix = fixes.find((f) => f.id === r.fixId);
  const kind: AlertKind = alert?.kind ?? (scenario!.id.includes('panel') ? 'power' : 'overheat');
  const stoppedAt = Math.max(0, chainDefs.findIndex((d) => d.id === fix?.stopsAtDominoId));
  const signals = alert?.signals ?? scenario!.signals;

  return {
    id: `live-${r.alertId}-${r.at}`,
    buildingId: alert?.buildingId ?? scenario!.buildingId,
    category: CATEGORY[kind],
    outcome: OUTCOME[kind],
    title: alert?.title ?? scenario!.title,
    summary: alert?.explanation ?? `${scenario!.asset} in ${scenario!.location} was about to break down.`,
    occurredAt: new Date(r.at).toISOString(),
    chain: chainDefs.map((d) => d.label),
    stoppedAt,
    fix: fix ? `${fix.title} (approved by ${r.byName})` : `Fixed by ${r.byName}`,
    fixMode: fix ? MODE[fix.mode] : 'one_tap',
    sources: [...new Set(signals.map((s) => SOURCE_LABELS[s.source]))],
    costAvoided: r.saved,
  };
}

/** An open alert, in the Client Report's "still at risk" format. */
function toActiveAlert(a: Alert): ActiveAlert {
  const best = a.fixes.find((f) => f.feasible);
  return {
    id: a.id,
    buildingId: a.buildingId,
    category: CATEGORY[a.kind],
    severity: a.severity,
    title: a.title,
    detail: `${a.asset} in ${a.location} will break down in about ${formatMinutes(a.chain[0].fallAtMin)}.`,
    moneyAtRisk: a.costAtRisk,
    eta: `in about ${formatMinutes(a.chain[0].fallAtMin)}`,
    recommendedFix: best?.title ?? 'Call the on-site team now',
  };
}

/** Live entries for the Client Report and Ask AI (newest data from the alerts system). */
export function useLiveReportEntries(): Required<LiveReportEntries> {
  const { fixHistory, alerts, openAlerts, autoFixes } = useAlerts();

  return useMemo(() => {
    const incidents = fixHistory
      .map((r) => toIncident(r, alerts.find((a) => a.id === r.alertId)))
      .filter((i): i is ResolvedIncident => i !== null);

    const wasteNights: WasteNight[] = autoFixes
      .filter((f) => !f.undone)
      .map((f) => ({
        buildingId: f.buildingId,
        zone: emptyFloorHvac.floor,
        date: new Date().toISOString(),
        kwhSaved: Math.round(f.savedPerNight / emptyFloorHvac.pricePerKWh),
        costSaved: Math.round(f.savedPerNight * 100) / 100,
      }));

    return { incidents, wasteNights, activeAlerts: openAlerts.map(toActiveAlert) };
  }, [fixHistory, alerts, openAlerts, autoFixes]);
}
