import { useState, useEffect, useCallback } from 'react';
import { getPublicActiveAlerts, getPublicAlertSummary, getSeverityConfig } from '../services/publicAlert.service';

// ── Severity Badge ────────────────────────────────────────────────────────────
function SeverityBadge({ severity }) {
    const cfg = getSeverityConfig(severity);
    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 10px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                background: cfg.bgColor,
                color: cfg.color,
                border: `1px solid ${cfg.borderColor}`,
            }}
        >
            {cfg.icon} {cfg.label}
        </span>
    );
}

// ── Pulse Dot ─────────────────────────────────────────────────────────────────
function PulseDot({ color }) {
    return (
        <span style={{ position: 'relative', display: 'inline-flex', width: 12, height: 12 }}>
            <span style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                background: color, opacity: 0.4,
                animation: 'pulseRing 1.5s ease-out infinite',
            }} />
            <span style={{
                position: 'relative', width: 12, height: 12, borderRadius: '50%',
                background: color, display: 'block',
            }} />
        </span>
    );
}

// ── Alert Card ────────────────────────────────────────────────────────────────
function AlertCard({ alert, isNew }) {
    const cfg = getSeverityConfig(alert.severity);
    const [expanded, setExpanded] = useState(false);
    const timeAgo = getTimeAgo(alert.createdAt);

    return (
        <div
            role="article"
            aria-label={`Alert: ${alert.title}`}
            style={{
                background: 'rgba(255,255,255,0.05)',
                backdropFilter: 'blur(12px)',
                border: `1px solid ${cfg.borderColor}30`,
                borderLeft: `4px solid ${cfg.color}`,
                borderRadius: '16px',
                padding: '20px 24px',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                animation: isNew ? 'slideInAlert 0.4s ease' : 'none',
            }}
            onClick={() => setExpanded(!expanded)}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
                {cfg.pulse && <PulseDot color={cfg.color} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                        <SeverityBadge severity={alert.severity} />
                        {alert.status === 'escalated' && (
                            <span style={{
                                padding: '2px 8px', borderRadius: '999px',
                                fontSize: '10px', fontWeight: 700,
                                background: 'rgba(220,38,38,0.15)', color: '#ef4444',
                                border: '1px solid rgba(220,38,38,0.3)',
                            }}>ESCALATED</span>
                        )}
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginLeft: 'auto' }}>
                            {timeAgo}
                        </span>
                    </div>
                    <h3 style={{
                        margin: 0, fontSize: '15px', fontWeight: 600,
                        color: 'rgba(255,255,255,0.92)', lineHeight: 1.4,
                    }}>
                        {alert.title}
                    </h3>
                </div>
            </div>

            {/* Dam + Region */}
            {(alert.damName || alert.regionName) && (
                <div style={{
                    display: 'flex', gap: 16, marginBottom: 8,
                    fontSize: '12px', color: 'rgba(255,255,255,0.5)',
                }}>
                    {alert.damName && (
                        <span>🏗️ {alert.damName}</span>
                    )}
                    {alert.regionName && (
                        <span>📍 {alert.regionName}</span>
                    )}
                </div>
            )}

            {/* Message preview or full */}
            <p style={{
                margin: 0, fontSize: '13px',
                color: 'rgba(255,255,255,0.65)',
                lineHeight: 1.6,
                overflow: expanded ? 'visible' : 'hidden',
                display: expanded ? 'block' : '-webkit-box',
                WebkitLineClamp: expanded ? 'unset' : 2,
                WebkitBoxOrient: expanded ? 'unset' : 'vertical',
            }}>
                {alert.message}
            </p>

            {/* Expand hint */}
            <div style={{
                marginTop: 8, fontSize: '11px', color: cfg.color, opacity: 0.7,
                textAlign: 'right',
            }}>
                {expanded ? '▲ Show less' : '▼ Read more'}
            </div>
        </div>
    );
}

// ── Summary Stat Card ─────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color, sublabel }) {
    return (
        <div style={{
            background: 'rgba(255,255,255,0.05)',
            border: `1px solid rgba(255,255,255,0.08)`,
            borderRadius: '20px',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            backdropFilter: 'blur(8px)',
        }}>
            <div style={{ fontSize: '28px' }}>{icon}</div>
            <div style={{
                fontSize: '36px', fontWeight: 800,
                color: color || 'white',
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
            }}>{value}</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{label}</div>
            {sublabel && (
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{sublabel}</div>
            )}
        </div>
    );
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState() {
    return (
        <div style={{
            textAlign: 'center', padding: '64px 24px',
            background: 'rgba(34,197,94,0.05)',
            border: '1px solid rgba(34,197,94,0.15)',
            borderRadius: '20px',
        }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
            <h3 style={{ margin: '0 0 8px', color: '#4ade80', fontSize: '20px', fontWeight: 700 }}>
                All Clear — No Active Alerts
            </h3>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
                All dams are currently within safe operating parameters.
                <br />
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>
                    Page auto-refreshes every 30 seconds.
                </span>
            </p>
        </div>
    );
}

// ── Skeleton Card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
    return (
        <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '16px', padding: '20px 24px',
            animation: 'shimmer 1.5s ease-in-out infinite',
        }}>
            {[80, 60, 100].map((w, i) => (
                <div key={i} style={{
                    height: i === 0 ? 14 : i === 1 ? 18 : 12,
                    width: `${w}%`,
                    background: 'rgba(255,255,255,0.06)',
                    borderRadius: 8,
                    marginBottom: 12,
                }} />
            ))}
        </div>
    );
}

// ── Time Ago Helper ───────────────────────────────────────────────────────────
function getTimeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PublicAlertsPage() {
    const [alerts, setAlerts] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [newAlertIds, setNewAlertIds] = useState(new Set());
    const [filter, setFilter] = useState('all'); // all | emergency | critical | warning | info

    const fetchData = useCallback(async (isFirstLoad = false) => {
        try {
            const [alertsData, summaryData] = await Promise.all([
                getPublicActiveAlerts(),
                getPublicAlertSummary(),
            ]);

            if (!isFirstLoad) {
                // Track new alerts for animation
                const currentIds = new Set(alerts.map(a => a.id));
                const newIds = new Set(alertsData.filter(a => !currentIds.has(a.id)).map(a => a.id));
                setNewAlertIds(newIds);
                setTimeout(() => setNewAlertIds(new Set()), 2000);
            }

            setAlerts(alertsData);
            setSummary(summaryData);
            setLastUpdated(new Date());
            setError(null);
        } catch (err) {
            console.error('Failed to fetch public alerts:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [alerts]);

    useEffect(() => {
        fetchData(true);
        const interval = setInterval(() => fetchData(false), 30_000);
        return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Filter alerts
    const filteredAlerts = filter === 'all'
        ? alerts
        : alerts.filter(a => a.severity?.toLowerCase() === filter);

    const hasEmergency = alerts.some(a => a.severity === 'emergency');
    const hasCritical = alerts.some(a => a.severity === 'critical' || a.severity === 'emergency');

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0f0c29 0%, #1a1a3e 40%, #24243e 100%)',
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            color: 'white',
        }}>
            {/* ── CSS Animations ── */}
            <style>{`
                @keyframes pulseRing {
                    0% { transform: scale(0.8); opacity: 0.8; }
                    70% { transform: scale(2.2); opacity: 0; }
                    100% { transform: scale(2.2); opacity: 0; }
                }
                @keyframes shimmer {
                    0%, 100% { opacity: 0.6; }
                    50% { opacity: 1; }
                }
                @keyframes slideInAlert {
                    from { opacity: 0; transform: translateY(-12px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes emergencyPulse {
                    0%, 100% { background-color: rgba(220,38,38,0.15); }
                    50% { background-color: rgba(220,38,38,0.35); }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .filter-btn {
                    padding: 6px 16px;
                    border-radius: 999px;
                    border: 1px solid rgba(255,255,255,0.15);
                    background: transparent;
                    color: rgba(255,255,255,0.6);
                    font-size: 13px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-family: inherit;
                }
                .filter-btn:hover {
                    background: rgba(255,255,255,0.08);
                    color: white;
                }
                .filter-btn.active {
                    background: rgba(255,255,255,0.12);
                    color: white;
                    border-color: rgba(255,255,255,0.3);
                }
            `}</style>

            {/* ── Emergency Banner ── */}
            {hasEmergency && (
                <div style={{
                    animation: 'emergencyPulse 1s ease-in-out infinite',
                    padding: '12px 24px',
                    textAlign: 'center',
                    fontSize: '14px',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    borderBottom: '1px solid rgba(220,38,38,0.3)',
                    color: '#fca5a5',
                }}>
                    🚨 EMERGENCY ALERT ACTIVE — FOLLOW EVACUATION INSTRUCTIONS IMMEDIATELY
                </div>
            )}

            {/* ── Header ── */}
            <header style={{
                background: 'rgba(0,0,0,0.3)',
                backdropFilter: 'blur(20px)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                padding: '20px 32px',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                position: 'sticky',
                top: 0,
                zIndex: 100,
            }}>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: '24px' }}>🌊</span>
                        <div>
                            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em' }}>
                                Dam Disaster Alert System
                            </h1>
                            <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                                Sri Lanka — Public Information Portal
                            </p>
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                    {loading && !lastUpdated ? (
                        <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#60a5fa', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    ) : (
                        <span>🔄</span>
                    )}
                    {lastUpdated && (
                        <span>Updated {getTimeAgo(lastUpdated?.toISOString())}</span>
                    )}
                    {/* Help line */}
                    <span style={{
                        marginLeft: 8, padding: '4px 12px', borderRadius: '999px',
                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                        color: '#fca5a5', fontWeight: 600,
                    }}>
                        Emergency: 1990
                    </span>
                </div>
            </header>

            {/* ── Main Content ── */}
            <main id="main-content" style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>

                {/* ── Status Summary Cards ── */}
                {summary && (
                    <section aria-label="Alert summary statistics" style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                        gap: 16,
                        marginBottom: 32,
                    }}>
                        <StatCard
                            icon={hasCritical ? '🚨' : '✅'}
                            value={summary.totalActiveAlerts || 0}
                            label="Active Alerts"
                            color={summary.totalActiveAlerts > 0 ? '#ef4444' : '#4ade80'}
                            sublabel="Right now"
                        />
                        <StatCard
                            icon="🏗️"
                            value={summary.escalatedAlerts || 0}
                            label="Escalated"
                            color={summary.escalatedAlerts > 0 ? '#f97316' : 'white'}
                        />
                        <StatCard
                            icon={summary.hasActiveEmergency ? '🔴' : '🟢'}
                            value={summary.hasActiveEmergency ? 'EMERGENCY' : 'NORMAL'}
                            label="System Status"
                            color={summary.hasActiveEmergency ? '#ef4444' : '#4ade80'}
                        />
                        <StatCard
                            icon="📞"
                            value="1990"
                            label="Emergency Helpline"
                            sublabel="24/7 Active"
                        />
                    </section>
                )}

                {/* ── Section Title + Filters ── */}
                <section aria-label="Active alerts list">
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        flexWrap: 'wrap', marginBottom: 20,
                    }}>
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, flex: 1 }}>
                            Active Alerts
                            {alerts.length > 0 && (
                                <span style={{
                                    marginLeft: 8, fontSize: '12px', fontWeight: 600,
                                    padding: '2px 8px', borderRadius: '999px',
                                    background: 'rgba(239,68,68,0.15)',
                                    color: '#fca5a5',
                                }}>
                                    {alerts.length}
                                </span>
                            )}
                        </h2>

                        {/* Severity filter buttons */}
                        <div role="group" aria-label="Filter by severity" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {['all', 'emergency', 'critical', 'warning', 'info'].map(f => (
                                <button
                                    key={f}
                                    className={`filter-btn${filter === f ? ' active' : ''}`}
                                    onClick={() => setFilter(f)}
                                    aria-pressed={filter === f}
                                >
                                    {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Error State */}
                    {error && (
                        <div style={{
                            padding: '16px 20px', borderRadius: '12px',
                            background: 'rgba(239,68,68,0.1)',
                            border: '1px solid rgba(239,68,68,0.2)',
                            color: '#fca5a5', marginBottom: 16,
                            display: 'flex', alignItems: 'center', gap: 8,
                        }}>
                            <span>⚠️</span>
                            <span>Unable to load alerts: {error}. Retrying...</span>
                            <button
                                onClick={() => fetchData(true)}
                                style={{
                                    marginLeft: 'auto', padding: '4px 12px', border: 'none',
                                    borderRadius: '999px', background: 'rgba(239,68,68,0.3)',
                                    color: '#fca5a5', cursor: 'pointer', fontSize: '12px',
                                    fontFamily: 'inherit',
                                }}
                            >Retry</button>
                        </div>
                    )}

                    {/* Loading Skeletons */}
                    {loading && !lastUpdated && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
                        </div>
                    )}

                    {/* Alert Cards List */}
                    {!loading && filteredAlerts.length === 0 && (
                        filter === 'all'
                            ? <EmptyState />
                            : (
                                <div style={{
                                    textAlign: 'center', padding: '48px 24px',
                                    color: 'rgba(255,255,255,0.4)', fontSize: '14px',
                                }}>
                                    No {filter} alerts found.
                                    <br />
                                    <button
                                        onClick={() => setFilter('all')}
                                        style={{
                                            marginTop: 12, padding: '6px 16px', borderRadius: '999px',
                                            border: '1px solid rgba(255,255,255,0.15)', background: 'transparent',
                                            color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
                                            fontFamily: 'inherit', fontSize: '13px',
                                        }}
                                    >
                                        Show all alerts
                                    </button>
                                </div>
                            )
                    )}

                    <div
                        role="feed"
                        aria-label="Active alert feed"
                        aria-busy={loading}
                        style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                    >
                        {filteredAlerts.map(alert => (
                            <AlertCard
                                key={alert.id}
                                alert={alert}
                                isNew={newAlertIds.has(alert.id)}
                            />
                        ))}
                    </div>
                </section>

                {/* ── Safety Instructions ── */}
                <section aria-label="Safety instructions" style={{
                    marginTop: 48,
                    padding: '28px 32px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '20px',
                }}>
                    <h2 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>
                        🛡️ Safety Guidelines / ආරක්ෂක මාර්ගෝපදේශ
                    </h2>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: 16,
                        fontSize: '13px',
                        color: 'rgba(255,255,255,0.55)',
                        lineHeight: 1.7,
                    }}>
                        <div>
                            <p style={{ margin: '0 0 4px', fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>
                                During a Warning Alert
                            </p>
                            <ul style={{ margin: 0, paddingLeft: 20 }}>
                                <li>Monitor official broadcasts closely</li>
                                <li>Prepare emergency kit (documents, water, medicine)</li>
                                <li>Know your nearest evacuation route</li>
                                <li>Contact family members and neighbors</li>
                            </ul>
                        </div>
                        <div>
                            <p style={{ margin: '0 0 4px', fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>
                                During Emergency Evacuation
                            </p>
                            <ul style={{ margin: 0, paddingLeft: 20 }}>
                                <li>Leave immediately — do not wait</li>
                                <li>Move to higher ground</li>
                                <li>Do not attempt to cross flooded roads</li>
                                <li>Call Emergency: <strong style={{ color: '#fca5a5' }}>1990</strong></li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* ── Footer ── */}
                <footer style={{
                    marginTop: 48, paddingTop: 24,
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    textAlign: 'center',
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.25)',
                    lineHeight: 2,
                }}>
                    <p style={{ margin: 0 }}>
                        Dam Disaster Alert System (DDAS) — Sri Lanka Irrigation Department
                    </p>
                    <p style={{ margin: 0 }}>
                        This page auto-refreshes every 30 seconds. Last checked: {lastUpdated?.toLocaleTimeString() || '—'}
                    </p>
                    <p style={{ margin: 0 }}>
                        Emergency: <a href="tel:1990" style={{ color: '#fca5a5', textDecoration: 'none' }}>1990</a>
                        {' · '}
                        Disaster Management Centre: <a href="tel:117" style={{ color: '#fca5a5', textDecoration: 'none' }}>117</a>
                    </p>
                </footer>
            </main>
        </div>
    );
}
