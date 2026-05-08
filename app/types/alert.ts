/**
 * alert.ts — TypeScript types matching AlertResponseDTO (fully aligned with DB schema)
 */

export type AlertSeverity = 'info' | 'warning' | 'critical' | 'emergency';

export type AlertStatus =
  | 'draft' | 'active' | 'escalated' | 'resolved' | 'expired' | 'cancelled';

export type AlertCategory =
  | 'dam' | 'weather' | 'flood' | 'evacuation' | 'system' | 'general';

export type AlertScope =
  | 'nationwide' | 'regional' | 'dam_specific' | 'zone_specific';

export type AlertSource =
  | 'automatic' | 'manual' | 'scheduled' | 'external';

// ── Main Alert shape (mirrors AlertResponseDTO fully) ─────────────────────────
export interface Alert {
  id: number;
  uuid: string;

  // Alert Type
  alertTypeId: number;
  alertTypeCode: string;
  alertTypeName: string;
  alertTypeNameSi: string | null;
  alertTypeCategory: AlertCategory;
  alertTypeIcon: string | null;       // MaterialCommunityIcons name from DB
  alertTypeColor: string | null;      // Hex color from DB
  requiresAcknowledgment: boolean;

  // Content
  title: string;
  titleSi: string | null;
  titleTa: string | null;
  message: string;
  messageSi: string | null;
  messageTa: string | null;

  // Classification
  severity: AlertSeverity;
  status: AlertStatus;
  source: AlertSource;
  scope: AlertScope;

  // Geographic
  damId: number | null;
  regionId: number | null;
  hazardZoneId: number | null;
  affectedZones: string | null;    // JSON string
  affectedRegions: string | null;  // JSON string
  latitude: number | null;
  longitude: number | null;
  radiusKm: number | null;

  // Hazard context
  hazardLevelId: number | null;
  riskScore: number | null;

  // Instructions
  actionRequired: string | null;
  actionRequiredSi: string | null;
  instructions: string | null;
  safeLocationIds: string | null;  // JSON string

  // Media
  imageUrl: string | null;

  // Timing
  issuedAt: string | null;
  effectiveFrom: string | null;
  expiresAt: string | null;
  resolvedAt: string | null;
  resolutionNotes: string | null;

  // Stats
  recipientCount: number;
  deliveredCount: number;
  readCount: number;
  acknowledgedCount: number;

  // Flags
  simulationMode: boolean;

  // Audit
  createdAt: string;
  updatedAt: string;
}

// ── Summary stats ─────────────────────────────────────────────────────────────
export interface AlertSummaryStats {
  critical: number;
  emergency: number;
  warning: number;
  info: number;
  total: number;
}

// ── Regional stats from GET /alerts/stats/region/:id ─────────────────────────
export interface RegionalAlertStats {
  regionId: number;
  activeAlertCount: number;
  affectedPopulation: number;
}

// ── Severity → card type ──────────────────────────────────────────────────────
export type CardType = 'critical' | 'warning' | 'info' | 'emergency';

export function severityToCardType(severity: AlertSeverity): CardType {
  return severity === 'emergency' ? 'critical' : severity as CardType;
}

// ── Icon resolution — prefer DB icon, fall back to severity default ───────────
export function resolveAlertIcon(alert: Alert): string {
  if (alert.alertTypeIcon) return alert.alertTypeIcon;
  switch (alert.severity) {
    case 'emergency': return 'alert-decagram';
    case 'critical':  return 'alert-octagon';
    case 'warning':   return 'alert';
    default:          return 'information';
  }
}

// ── Color resolution — prefer DB color, fall back to severity default ─────────
export function resolveAlertColor(alert: Alert): string {
  if (alert.alertTypeColor) return alert.alertTypeColor;
  switch (alert.severity) {
    case 'emergency': return '#DC2626';
    case 'critical':  return '#EF4444';
    case 'warning':   return '#F59E0B';
    default:          return '#3B82F6';
  }
}

// ── Relative time helper ──────────────────────────────────────────────────────
export function formatRelativeTime(isoString: string | null | undefined): string {
  if (!isoString) return 'Unknown time';
  const date = new Date(isoString);
  const diffMs  = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1)  return 'Just now';
  if (diffMin < 60) return `${diffMin} min${diffMin > 1 ? 's' : ''} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24)  return `${diffHr} hr${diffHr > 1 ? 's' : ''} ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

// ── Category label ────────────────────────────────────────────────────────────
export function categoryLabel(cat: AlertCategory | string): string {
  const map: Record<string, string> = {
    dam: 'Dam', weather: 'Weather', flood: 'Flood',
    evacuation: 'Evacuation', system: 'System', general: 'General',
  };
  return map[cat] ?? cat;
}
