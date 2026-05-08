/**
 * alertApi.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Typed fetch wrappers for the DDAS Alert API.
 * Base URL: process.env.EXPO_PUBLIC_API_URL  (e.g. http://10.0.2.2:8080/api/v1)
 *
 * Endpoints consumed:
 *   GET  /alerts/active                   – all live alerts
 *   GET  /alerts/search?status=&severity= – filtered list
 *   GET  /alerts/dam/:damId               – dam-specific alerts
 *   GET  /alerts/stats/region/:regionId   – regional stats
 *   POST /alerts/broadcast/region/:id     – regional broadcast (admin)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  Alert,
  AlertSeverity,
  AlertStatus,
  AlertSummaryStats,
  RegionalAlertStats,
} from '@/types/alert';

// ── Base URL ────────────────────────────────────────────────────────────────
const API_BASE =
  (process.env.EXPO_PUBLIC_API_URL ?? 'http://157.245.159.17:8080/api/v1') + '/alerts';

// ── Auth helper ─────────────────────────────────────────────────────────────
async function authHeaders(): Promise<HeadersInit> {
  const token = await AsyncStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ── Generic request wrapper ─────────────────────────────────────────────────
async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const headers = await authHeaders();
  
  const controller = new AbortController();
  const timeout = parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT || '10000', 10);
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(`${API_BASE}${path}`, { 
      ...options, 
      headers,
      signal: controller.signal as AbortSignal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`API ${res.status}: ${errText}`);
    }

    const json = await res.json();
    // Unwrap Spring Boot ApiResponse envelope  { success, message, data }
    return (json?.data ?? json) as T;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('API request timed out');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch all currently active alerts (status = active).
 * Used as the default feed on the Alerts screen.
 */
export async function fetchActiveAlerts(): Promise<Alert[]> {
  return apiFetch<Alert[]>('/active');
}

/**
 * Search alerts with optional filters.
 * Any null/undefined param is omitted from the query string.
 */
export async function searchAlerts(params: {
  status?: AlertStatus | null;
  severity?: AlertSeverity | null;
  regionId?: number | null;
}): Promise<Alert[]> {
  const qs = new URLSearchParams();
  if (params.status)   qs.set('status',   params.status);
  if (params.severity) qs.set('severity', params.severity);
  if (params.regionId) qs.set('regionId', String(params.regionId));

  const query = qs.toString() ? `?${qs}` : '';
  return apiFetch<Alert[]>(`/search${query}`);
}

/**
 * Fetch active alerts for a specific dam.
 */
export async function fetchDamAlerts(damId: number): Promise<Alert[]> {
  return apiFetch<Alert[]>(`/dam/${damId}`);
}

/**
 * Fetch regional alert statistics (count, estimated affected population).
 */
export async function fetchRegionalStats(
  regionId: number,
): Promise<RegionalAlertStats> {
  return apiFetch<RegionalAlertStats>(`/stats/region/${regionId}`);
}

/**
 * Compute summary badge counts from an alert list.
 * Avoids an extra round-trip when we already have the full list.
 */
export function computeSummaryStats(alerts: Alert[]): AlertSummaryStats {
  const stats: AlertSummaryStats = {
    critical: 0,
    emergency: 0,
    warning: 0,
    info: 0,
    total: alerts.length,
  };

  for (const a of alerts) {
    switch (a.severity) {
      case 'emergency': stats.emergency++; break;
      case 'critical':  stats.critical++;  break;
      case 'warning':   stats.warning++;   break;
      case 'info':      stats.info++;      break;
    }
  }

  return stats;
}
