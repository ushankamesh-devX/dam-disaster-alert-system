import { damService } from './dam.service';
import { damStatusService } from './dam-status.service';
import { forecastService, type DamForecast } from '../forecasts/forecast.service';

export interface DashboardDam {
  id: number;
  name: string;
  code: string;
  status: string;
  region?: { name: string };
  riverName?: string | null;
  reservoirCapacityMcm: number | null;
}
export interface CurrentMeasurements {
  damId: number;
  waterLevelMeters: number | null;
  waterLevelPercentage: number | null;
  inflowCumecs: number | null;
  outflowCumecs: number | null;
  storageCurrentMcm: number | null;
  storagePercentage: number | null;
  hazardStatus: string | null;
  lastUpdated: string | null;
  lastSensorReadingAt: string | null;
  lastHazardAssessmentAt: string | null;
}
export interface DashboardSnapshot {
  dam: DashboardDam;
  current: CurrentMeasurements | null;
  forecasts: DamForecast[];
  measurementsFailed: boolean;
  forecastsFailed: boolean;
}

// Dam detail/status are raw DTOs; forecasts use ApiResponse<T>.
// Never substitute another dam or demo data.
export async function loadDashboard(damId: number): Promise<DashboardSnapshot> {
  const detail = await damService.getById(String(damId));
  const dam = detail.data as DashboardDam;
  if (!dam || dam.id !== damId || dam.status !== 'operational') {
    throw new Error('Your selected dam is unavailable. Choose another dam in Settings.');
  }
  const [status, forecast] = await Promise.allSettled([
    damStatusService.getByDam(String(damId)), forecastService.getLatest(String(damId)),
  ]);
  const current = status.status === 'fulfilled' ? status.value.data as CurrentMeasurements | null : null;
  const forecasts = forecast.status === 'fulfilled' ? forecast.value.data.data : [];
  const statusMismatch = !!current && current.damId !== damId;
  const forecastMismatch = !Array.isArray(forecasts) || forecasts.some(row => row.damId !== damId);
  return {
    dam,
    current: statusMismatch ? null : current,
    forecasts: forecastMismatch ? [] : forecasts.filter(row => row.isPublished === true).sort((a, b) => a.horizonHours - b.horizonHours),
    measurementsFailed: (status.status === 'rejected' && status.reason?.response?.status !== 404) || statusMismatch,
    forecastsFailed: forecast.status === 'rejected' || forecastMismatch,
  };
}

export function formatMeasurement(value: unknown, unit = ''): string {
  if (value == null || value === '' || typeof value === 'boolean') return 'Unavailable';
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${numeric.toLocaleString(undefined, { maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ''}` : 'Unavailable';
}

// The API returns LocalDateTime without an offset. Display its recorded clock
// explicitly rather than silently interpreting it as the phone's timezone.
export function formatRecordedTime(value: string | null | undefined): string {
  if (!value) return 'Unavailable';
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}(?::\d{2})?)/.exec(value);
  return match ? `${match[1]} ${match[2]} (server time)` : 'Unavailable';
}
