/**
 * useAlerts.ts — with sound & haptic integration
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchActiveAlerts, computeSummaryStats } from '@/services/alertApi';
import { playAlertSound, getMuted, setMuted } from '@/services/alertSound';
import type { Alert, AlertSeverity, AlertSummaryStats } from '@/types/alert';

export type SeverityFilter = 'all' | AlertSeverity;

const POLL_INTERVAL_MS = 30_000;

// Severity priority for "highest new alert" detection
const SEV_ORDER: Record<string, number> = {
  emergency: 0, critical: 1, warning: 2, info: 3,
};

interface UseAlertsResult {
  alerts: Alert[];
  stats: AlertSummaryStats;
  activeFilter: SeverityFilter;
  setFilter: (f: SeverityFilter) => void;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => void;
  isMuted: boolean;
  toggleMute: () => void;
}

export function useAlerts(): UseAlertsResult {
  const [allAlerts, setAllAlerts]     = useState<Alert[]>([]);
  const [activeFilter, setActiveFilter] = useState<SeverityFilter>('all');
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [isMuted, setIsMuted]           = useState(false);

  // Track known alert UUIDs so we can detect NEW ones on each poll
  const knownIdsRef  = useRef<Set<string>>(new Set());
  const isFirstLoad  = useRef(true);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load mute preference on mount
  useEffect(() => {
    getMuted().then(setIsMuted);
  }, []);

  const toggleMute = useCallback(async () => {
    const next = !isMuted;
    setIsMuted(next);
    await setMuted(next);
  }, [isMuted]);

  // ── Sorted filtered view ────────────────────────────────────────────────────
  const alerts: Alert[] =
    activeFilter === 'all'
      ? allAlerts
      : allAlerts.filter((a) => a.severity === activeFilter);

  const stats: AlertSummaryStats = computeSummaryStats(allAlerts);

  // ── Data fetch ─────────────────────────────────────────────────────────────
  const loadAlerts = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else           setLoading(true);
      setError(null);

      const data = await fetchActiveAlerts();

      // Sort by severity then newest first
      const sorted = [...data].sort((a, b) => {
        const so = (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9);
        if (so !== 0) return so;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      // ── Detect NEW alerts since last poll ───────────────────────────────────
      if (!isFirstLoad.current) {
        const newAlerts = sorted.filter((a) => !knownIdsRef.current.has(a.uuid));

        if (newAlerts.length > 0) {
          // Play sound for the highest-severity new alert
          const highest = newAlerts.reduce((best, a) =>
            (SEV_ORDER[a.severity] ?? 9) < (SEV_ORDER[best.severity] ?? 9) ? a : best,
          );
          playAlertSound(highest.severity); // fire-and-forget
        }
      }

      // Update known IDs
      knownIdsRef.current = new Set(sorted.map((a) => a.uuid));
      isFirstLoad.current = false;

      setAllAlerts(sorted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alerts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ── Initial load + polling ─────────────────────────────────────────────────
  useEffect(() => {
    loadAlerts(false);
    pollTimerRef.current = setInterval(() => loadAlerts(false), POLL_INTERVAL_MS);
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [loadAlerts]);

  const setFilter = useCallback((f: SeverityFilter) => setActiveFilter(f), []);
  const refresh   = useCallback(() => loadAlerts(true), [loadAlerts]);

  return { alerts, stats, activeFilter, setFilter, loading, refreshing, error, refresh, isMuted, toggleMute };
}
