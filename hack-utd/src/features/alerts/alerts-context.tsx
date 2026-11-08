import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

import { scanPortfolio, type ScanResult } from './ai';
import { backendConfigured, fetchFixes, fetchReadings, saveFix, watchBackend, type FixRow } from './backend';
import { offlineRows, type ReadingRow } from './readings';
import type { Alert, AutoFix, Resolution } from './types';

/** Savings already banked earlier this month (demo baseline). */
const SAVED_EARLIER_THIS_MONTH = 18_450;

/** 'live' = readings came from Supabase; 'offline' = built-in demo readings. */
export type DataSource = 'live' | 'offline';

type AlertsValue = {
  status: 'scanning' | 'ready' | 'error';
  scannedAt: number | null;
  dataSource: DataSource;
  /** The sensor readings the last scan used (shared with the Data tab). */
  readings: ReadingRow[];
  /** Every alert from the last scan, ranked by $ at risk. */
  alerts: Alert[];
  autoFixes: AutoFix[];
  /** Active fixes by alert id: the alert's newest bad reading is older than the fix. */
  resolutions: Record<string, Resolution>;
  /** Every fix ever applied (for the Client Report), oldest first. */
  fixHistory: Resolution[];
  openAlerts: Alert[];
  totalAtRisk: number;
  savedThisMonth: number;
  rescan: () => Promise<void>;
  getAlert: (id: string) => Alert | undefined;
  applyFix: (alertId: string, fixId: string, byName: string) => Resolution | null;
  setAutoFixUndone: (id: string, undone: boolean) => void;
};

type Snapshot = { result: ScanResult; rows: ReadingRow[]; fixes: FixRow[]; source: DataSource };

/**
 * Reads the backend (or the built-in demo data if it's not set up / not
 * reachable) and runs detection. Pure: no React state in here.
 */
async function gather(): Promise<Snapshot> {
  if (backendConfigured) {
    try {
      const [rows, fixes] = await Promise.all([fetchReadings(), fetchFixes()]);
      return { result: scanPortfolio(rows), rows, fixes, source: 'live' };
    } catch (err) {
      console.warn('[alerts] backend unreachable, using built-in demo data:', err);
    }
  }
  // Fixed timestamps, so offline readings don't look "newer" than a fix on every rescan.
  offlineStart ??= Date.now();
  const rows = offlineRows(offlineStart);
  return { result: scanPortfolio(rows), rows, fixes: [], source: 'offline' };
}

let offlineStart: number | null = null;

const AlertsContext = createContext<AlertsValue | null>(null);

export function AlertsProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AlertsValue['status']>('scanning');
  const [scannedAt, setScannedAt] = useState<number | null>(null);
  const [dataSource, setDataSource] = useState<DataSource>('offline');
  const [readings, setReadings] = useState<ReadingRow[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [autoFixes, setAutoFixes] = useState<AutoFix[]>([]);
  /** Fixes saved in the backend (source of truth when live). */
  const [savedFixes, setSavedFixes] = useState<FixRow[]>([]);
  /** Fixes applied on this phone that aren't confirmed in the backend (yet / offline). */
  const [localFixes, setLocalFixes] = useState<Record<string, Resolution>>({});

  const applySnapshot = useCallback(({ result, rows, fixes, source }: Snapshot) => {
    setReadings(rows);
    // Keep each alert's first-seen time stable while its data keeps updating.
    setAlerts((prev) =>
      result.alerts.map((a) => {
        const before = prev.find((p) => p.id === a.id);
        return before ? { ...a, detectedAt: before.detectedAt } : a;
      })
    );
    // Keep the user's undo choices across rescans.
    setAutoFixes((prev) =>
      result.autoFixes.map((f) => ({
        ...f,
        undone: prev.find((p) => p.id === f.id)?.undone ?? f.undone,
      }))
    );
    setSavedFixes(fixes);
    setDataSource(source);
    setScannedAt(result.scannedAt);
    setStatus('ready');
  }, []);

  // Coalesce bursts of backend changes (e.g. an SQL insert of 7 rows) into one rescan.
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleReload = useCallback(() => {
    if (reloadTimer.current) clearTimeout(reloadTimer.current);
    reloadTimer.current = setTimeout(() => {
      gather().then(applySnapshot);
    }, 300);
  }, [applySnapshot]);

  // First scan, then keep watching the backend for changes.
  useEffect(() => {
    gather()
      .then(applySnapshot)
      .catch(() => setStatus('error'));
    if (!backendConfigured) return;
    const stop = watchBackend(scheduleReload);
    return () => {
      stop();
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
    };
  }, [applySnapshot, scheduleReload]);

  const rescan = useCallback(async () => {
    setStatus('scanning');
    try {
      applySnapshot(await gather());
    } catch {
      setStatus('error');
    }
  }, [applySnapshot]);

  const getAlert = useCallback((id: string) => alerts.find((a) => a.id === id), [alerts]);

  const applyFix = useCallback(
    (alertId: string, fixId: string, byName: string) => {
      const alert = alerts.find((a) => a.id === alertId);
      const fix = alert?.fixes.find((f) => f.id === fixId);
      if (!alert || !fix || !fix.feasible) return null;
      const resolution: Resolution = {
        alertId,
        fixId,
        saved: fix.saved,
        byName,
        at: Date.now(),
        notified: fix.notifies,
      };
      // Show it as fixed right away; then save it to the backend.
      setLocalFixes((prev) => ({ ...prev, [alertId]: resolution }));
      if (dataSource === 'live') {
        saveFix({ alert_id: alertId, fix_id: fixId, applied_by: byName, saved_usd: fix.saved })
          .then(() => {
            // The backend has it now; drop the local copy so a backend reset clears it.
            setLocalFixes(({ [alertId]: _saved, ...rest }) => rest);
            scheduleReload();
          })
          .catch((err) => console.warn('[alerts] could not save fix; keeping it on this phone:', err));
      }
      return resolution;
    },
    [alerts, dataSource, scheduleReload]
  );

  const setAutoFixUndone = useCallback((id: string, undone: boolean) => {
    setAutoFixes((prev) => prev.map((f) => (f.id === id ? { ...f, undone } : f)));
  }, []);

  const value = useMemo<AlertsValue>(() => {
    // Every fix: the ones saved in the backend, plus any not-yet-saved local ones.
    const fixHistory: Resolution[] = savedFixes.map((row) => ({
      alertId: row.alert_id,
      fixId: row.fix_id,
      saved: row.saved_usd,
      byName: row.applied_by,
      at: Date.parse(row.applied_at),
      notified:
        alerts.find((a) => a.id === row.alert_id)?.fixes.find((f) => f.id === row.fix_id)?.notifies ?? [],
    }));
    fixHistory.push(...Object.values(localFixes));
    fixHistory.sort((a, b) => a.at - b.at);

    // An alert counts as fixed only if its latest fix came after its newest bad
    // reading. A bad reading added after the fix reopens it.
    const resolutions: Record<string, Resolution> = {};
    for (const r of fixHistory) resolutions[r.alertId] = r; // later fixes win
    for (const a of alerts) {
      const r = resolutions[a.id];
      if (r && r.at < a.dataAt) delete resolutions[a.id];
    }

    const openAlerts = alerts.filter((a) => !resolutions[a.id]);
    const totalAtRisk = openAlerts.reduce((s, a) => s + a.costAtRisk, 0);
    const savedThisMonth =
      SAVED_EARLIER_THIS_MONTH +
      fixHistory.reduce((s, r) => s + r.saved, 0) +
      autoFixes.filter((f) => !f.undone).reduce((s, f) => s + f.savedPerNight, 0);
    return {
      status,
      scannedAt,
      dataSource,
      readings,
      alerts,
      autoFixes,
      resolutions,
      fixHistory,
      openAlerts,
      totalAtRisk,
      savedThisMonth,
      rescan,
      getAlert,
      applyFix,
      setAutoFixUndone,
    };
  }, [
    status,
    scannedAt,
    dataSource,
    readings,
    alerts,
    autoFixes,
    savedFixes,
    localFixes,
    rescan,
    getAlert,
    applyFix,
    setAutoFixUndone,
  ]);

  return <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>;
}

export function useAlerts() {
  const ctx = useContext(AlertsContext);
  if (!ctx) throw new Error('useAlerts must be used inside <AlertsProvider>');
  return ctx;
}
