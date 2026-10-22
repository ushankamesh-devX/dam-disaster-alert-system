/**
 * Public Alert Service — DDAS Public Information API
 *
 * Authentication නොමැතිව public endpoint-ෙ access කරයි.
 * Spring Boot: GET /api/public/active-alerts
 *
 * Use cases:
 *   - Public Information Page (no login required)
 *   - Emergency alert ticker/banner
 *   - Dam-specific alert badges
 */

const PUBLIC_API_BASE = import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api/public`
    : '/api/public';

/**
 * All currently active + escalated alerts (public, no auth needed).
 * Returns enriched data with dam name, region, coordinates.
 */
export const getPublicActiveAlerts = async () => {
    const response = await fetch(`${PUBLIC_API_BASE}/active-alerts`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to fetch public alerts: ${error}`);
    }

    const json = await response.json();
    return json.data || [];
};

/**
 * Active alerts summary counts for dashboard widgets.
 */
export const getPublicAlertSummary = async () => {
    const response = await fetch(`${PUBLIC_API_BASE}/active-alerts/summary`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
        throw new Error('Failed to fetch alert summary');
    }

    return response.json();
};

/**
 * Active alerts for a specific dam (public, no auth needed).
 */
export const getPublicAlertsByDam = async (damId) => {
    const response = await fetch(`${PUBLIC_API_BASE}/active-alerts/dam/${damId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch alerts for dam ${damId}`);
    }

    const json = await response.json();
    return json.data || [];
};

// ── Severity Helpers ──────────────────────────────────────────────────────────

export const SEVERITY_CONFIG = {
    emergency: {
        label: 'Emergency',
        labelSi: 'හදිසි',
        color: '#DC2626',
        bgColor: '#FEF2F2',
        borderColor: '#FCA5A5',
        icon: '🚨',
        pulse: true,
    },
    critical: {
        label: 'Critical',
        labelSi: 'විවේචනීය',
        color: '#EA580C',
        bgColor: '#FFF7ED',
        borderColor: '#FED7AA',
        icon: '⚠️',
        pulse: true,
    },
    warning: {
        label: 'Warning',
        labelSi: 'අනතුරු ඇඟවීම',
        color: '#D97706',
        bgColor: '#FFFBEB',
        borderColor: '#FDE68A',
        icon: '🔶',
        pulse: false,
    },
    info: {
        label: 'Information',
        labelSi: 'තොරතුරු',
        color: '#2563EB',
        bgColor: '#EFF6FF',
        borderColor: '#BFDBFE',
        icon: 'ℹ️',
        pulse: false,
    },
};

export const getSeverityConfig = (severity) => {
    return SEVERITY_CONFIG[severity?.toLowerCase()] || SEVERITY_CONFIG.info;
};
