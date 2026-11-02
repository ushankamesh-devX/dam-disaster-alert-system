import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Vibration } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ensureAuth } from '@/services/api/auto-auth';
import { alertService, AppAlert } from '@/services/alerts/alert.service';
import { evacuationService } from '@/services/evacuation/evacuation.service';
import { isUrgent, newestFirst } from './alertStyle';

type Dam = { id: number; name: string };
type DamStatus = Awaited<ReturnType<typeof evacuationService.damStatuses>>[number];

type Ctx = {
  active: AppAlert[];
  unseen: number;
  isUnseen: (id: number) => boolean;
  incoming: AppAlert | null;       // a new alert to pop up
  damName: (id?: number | null) => string;
  damStatus: (id?: number | null) => DamStatus | undefined;
  refresh: () => Promise<void>;
  dismiss: () => void;             // close the pop-up
  markAllSeen: () => void;         // the Alerts page was opened
};

const AlertsCtx = createContext<Ctx | null>(null);
const SEEN_KEY = 'ddas-seen-alerts';
const POLL_MS = 10_000;

/**
 * Watches for alerts while the app is open (Expo Go has no remote push): checks every 10 s,
 * pops up and vibrates for each new alert the admin publishes on the web.
 */
export function AlertsProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<AppAlert[]>([]);
  const [seen, setSeen] = useState<Set<number> | null>(null);
  const [incoming, setIncoming] = useState<AppAlert | null>(null);
  const [dams, setDams] = useState<Dam[]>([]);
  const [statuses, setStatuses] = useState<DamStatus[]>([]);
  const seenRef = useRef<Set<number> | null>(null);
  const notified = useRef<number | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(SEEN_KEY)
      .then((v) => new Set<number>(v ? JSON.parse(v) : []))
      .catch(() => new Set<number>())
      .then((s) => { seenRef.current = s; setSeen(s); });
  }, []);

  const saveSeen = (s: Set<number>) => {
    seenRef.current = s;
    setSeen(new Set(s));
    AsyncStorage.setItem(SEEN_KEY, JSON.stringify([...s].slice(-200))).catch(() => undefined);
  };

  const refresh = useCallback(async () => {
    try {
      await ensureAuth();
      const [list, st] = await Promise.all([alertService.listActive(), evacuationService.damStatuses().catch(() => null)]);
      const sorted = [...list].sort(newestFirst);
      setActive(sorted);
      if (st) setStatuses(st);
      const s = seenRef.current;
      const fresh = s ? sorted.find((a) => !s.has(a.id)) : undefined;
      if (fresh && notified.current !== fresh.id) {
        notified.current = fresh.id;   // vibrate once per alert, not on every check
        setIncoming(fresh);
        Vibration.vibrate(isUrgent(fresh) ? [0, 800, 300, 800, 300, 800] : [0, 400, 200, 400]);
      }
    } catch {
      // offline: keep the last list
    }
  }, []);

  useEffect(() => {
    if (!seen) return;
    refresh();
    evacuationService.dams().then(setDams).catch(() => undefined);
    const id = setInterval(refresh, POLL_MS);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => { clearInterval(id); sub.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seen !== null, refresh]);

  const dismiss = useCallback(() => {
    setIncoming((cur) => {
      if (cur && seenRef.current) saveSeen(new Set([...seenRef.current, cur.id]));
      return null;
    });
  }, []);

  const markAllSeen = useCallback(() => {
    // the pop-up stays until it is dismissed
    if (seenRef.current && active.some((a) => !seenRef.current!.has(a.id))) {
      saveSeen(new Set([...seenRef.current, ...active.map((a) => a.id)]));
    }
  }, [active]);

  const value = useMemo<Ctx>(() => ({
    active,
    unseen: seen ? active.filter((a) => !seen.has(a.id)).length : 0,
    isUnseen: (id) => !!seen && !seen.has(id),
    incoming,
    damName: (id) => dams.find((d) => d.id === id)?.name ?? '',
    damStatus: (id) => statuses.find((s) => s.damId === id),
    refresh,
    dismiss,
    markAllSeen,
  }), [active, seen, incoming, dams, statuses, refresh, dismiss, markAllSeen]);

  return <AlertsCtx.Provider value={value}>{children}</AlertsCtx.Provider>;
}

export function useAlerts() {
  const ctx = useContext(AlertsCtx);
  if (!ctx) throw new Error('useAlerts must be used inside AlertsProvider');
  return ctx;
}
