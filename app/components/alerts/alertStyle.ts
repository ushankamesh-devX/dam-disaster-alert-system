import type { AppAlert } from '@/services/alerts/alert.service';

export type AlertLook = { color: string; soft: string; icon: string; label: string };

/** Colour per alert: All Clear green, then by severity (emergency and critical red, warning amber, info blue). */
export function alertLook(a: AppAlert): AlertLook {
  const type = (a.alertTypeName || '').toLowerCase();
  if (type.includes('all clear')) return { color: '#15803D', soft: '#DCFCE7', icon: 'check-decagram', label: 'All clear' };
  switch (a.severity) {
    case 'emergency': return { color: '#991B1B', soft: '#FEE2E2', icon: 'alarm-light', label: 'Emergency' };
    case 'critical': return { color: '#DC2626', soft: '#FEE2E2', icon: 'alert-decagram', label: 'Critical' };
    case 'warning': return { color: '#D97706', soft: '#FEF3C7', icon: 'alert', label: 'Warning' };
    default: return { color: '#2563EB', soft: '#DBEAFE', icon: 'information', label: 'Info' };
  }
}

export const isUrgent = (a: AppAlert) => a.severity === 'critical' || a.severity === 'emergency';
export const isEvacuation = (a: AppAlert) => /evacuat/i.test(`${a.alertTypeName} ${a.title}`);

/** The API sends UTC times without a zone ("2026-11-01T17:38:11"). */
export function serverTime(t?: string): Date | null {
  if (!t) return null;
  const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(t) ? t : `${t}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "23:08 · 12 min ago" in Sri Lanka time. */
export function timeLabel(t?: string): string {
  const d = serverTime(t);
  if (!d) return '';
  // Sri Lanka is UTC+5:30 all year; shift by hand so it doesn't depend on the phone's zone or Intl support
  const lk = new Date(d.getTime() + 330 * 60000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const clock = `${pad(lk.getUTCHours())}:${pad(lk.getUTCMinutes())}`;
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const ago = mins < 1 ? 'just now' : mins < 60 ? `${mins} min ago` : mins < 1440 ? `${Math.round(mins / 60)} h ago`
    : `${lk.getUTCDate()} ${months[lk.getUTCMonth()]}`;
  return `${clock} · ${ago}`;
}

export const newestFirst = (a: AppAlert, b: AppAlert) =>
  (serverTime(b.createdAt)?.getTime() ?? 0) - (serverTime(a.createdAt)?.getTime() ?? 0);
