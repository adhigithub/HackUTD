import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import { scanPortfolio, type ScanResult } from './mock-ai';
import type { Alert, AutoFix, Resolution } from './types';

/** Savings already banked earlier this month (demo baseline). */
const SAVED_EARLIER_THIS_MONTH = 18_450;

type AlertsValue = {
  status: 'scanning' | 'ready' | 'error';
  scannedAt: number | null;
  /** Every alert from the last scan, ranked by $ at risk. */
  alerts: Alert[];
  autoFixes: AutoFix[];
  resolutions: Record<string, Resolution>;
  openAlerts: Alert[];
  totalAtRisk: number;
  savedThisMonth: number;
  rescan: () => Promise<void>;
  getAlert: (id: string) => Alert | undefined;
  applyFix: (alertId: string, fixId: string, byName: string) => Resolution | null;
  setAutoFixUndone: (id: string, undone: boolean) => void;
};

const AlertsContext = createContext<AlertsValue | null>(null);

export function AlertsProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AlertsValue['status']>('scanning');
  const [scannedAt, setScannedAt] = useState<number | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [autoFixes, setAutoFixes] = useState<AutoFix[]>([]);
  const [resolutions, setResolutions] = useState<Record<string, Resolution>>({});

  const applyResult = useCallback((result: ScanResult) => {
    setAlerts(result.alerts);
    // Keep the user's undo choices across rescans.
    setAutoFixes((prev) =>
      result.autoFixes.map((f) => ({
        ...f,
        undone: prev.find((p) => p.id === f.id)?.undone ?? f.undone,
      }))
    );
    setScannedAt(result.scannedAt);
    setStatus('ready');
  }, []);

  // First scan when the signed-in app mounts (status starts as 'scanning').
  useEffect(() => {
    scanPortfolio()
      .then(applyResult)
      .catch(() => setStatus('error'));
  }, [applyResult]);

  const rescan = useCallback(async () => {
    setStatus('scanning');
    try {
      applyResult(await scanPortfolio());
    } catch {
      setStatus('error');
    }
  }, [applyResult]);

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
      setResolutions((prev) => ({ ...prev, [alertId]: resolution }));
      return resolution;
    },
    [alerts]
  );

  const setAutoFixUndone = useCallback((id: string, undone: boolean) => {
    setAutoFixes((prev) => prev.map((f) => (f.id === id ? { ...f, undone } : f)));
  }, []);

  const value = useMemo<AlertsValue>(() => {
    const openAlerts = alerts.filter((a) => !resolutions[a.id]);
    const totalAtRisk = openAlerts.reduce((s, a) => s + a.costAtRisk, 0);
    const savedThisMonth =
      SAVED_EARLIER_THIS_MONTH +
      Object.values(resolutions).reduce((s, r) => s + r.saved, 0) +
      autoFixes.filter((f) => !f.undone).reduce((s, f) => s + f.savedPerNight, 0);
    return {
      status,
      scannedAt,
      alerts,
      autoFixes,
      resolutions,
      openAlerts,
      totalAtRisk,
      savedThisMonth,
      rescan,
      getAlert,
      applyFix,
      setAutoFixUndone,
    };
  }, [status, scannedAt, alerts, autoFixes, resolutions, rescan, getAlert, applyFix, setAutoFixUndone]);

  return <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>;
}

export function useAlerts() {
  const ctx = useContext(AlertsContext);
  if (!ctx) throw new Error('useAlerts must be used inside <AlertsProvider>');
  return ctx;
}
