import { useEffect, useState, useCallback } from 'react';
import {
    Box,
    Paper,
    Typography,
    Chip,
    LinearProgress,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    CircularProgress,
    Tooltip,
} from '@mui/material';
import AutoGraphRounded from '@mui/icons-material/AutoGraphRounded';
import RefreshRounded from '@mui/icons-material/RefreshRounded';
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded';
import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded';
import EditRounded from '@mui/icons-material/EditRounded';
import WavesRounded from '@mui/icons-material/WavesRounded';
import ShieldRounded from '@mui/icons-material/ShieldRounded';
import {
    AreaChart,
    Area,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    ReferenceLine,
} from 'recharts';
import toast from 'react-hot-toast';
import { getDamForecasts, getDamOverflowConfig, updateDamOverflowConfig } from '../../services/ml.service';

export default function DamForecastWidget({ damId, dam }) {
    const [forecasts, setForecasts] = useState([]);
    const [overflowConfig, setOverflowConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [savingConfig, setSavingConfig] = useState(false);

    const [form, setForm] = useState({
        crestLevelMeters: '',
        overflowThresholdMeters: '',
        freeboardBufferMeters: '1.0',
        definitionNotes: '',
    });

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [fcData, ovData] = await Promise.allSettled([
                getDamForecasts(damId),
                getDamOverflowConfig(damId),
            ]);

            if (fcData.status === 'fulfilled') {
                setForecasts(fcData.value || []);
            } else {
                setForecasts([]);
            }

            if (ovData.status === 'fulfilled' && ovData.value) {
                setOverflowConfig(ovData.value);
                setForm({
                    crestLevelMeters: ovData.value.crestLevelMeters ?? '',
                    overflowThresholdMeters: ovData.value.overflowThresholdMeters ?? '',
                    freeboardBufferMeters: ovData.value.freeboardBufferMeters ?? '1.0',
                    definitionNotes: ovData.value.definitionNotes ?? '',
                });
            }
        } catch {
            toast.error('Failed loading forecast information');
        } finally {
            setLoading(false);
        }
    }, [damId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSaveConfig = async (e) => {
        e.preventDefault();
        setSavingConfig(true);
        try {
            const payload = {
                crestLevelMeters: Number(form.crestLevelMeters),
                overflowThresholdMeters: Number(form.overflowThresholdMeters),
                freeboardBufferMeters: Number(form.freeboardBufferMeters || 1.0),
                definitionNotes: form.definitionNotes,
            };
            const updated = await updateDamOverflowConfig(damId, payload);
            setOverflowConfig(updated);
            toast.success('Overflow configuration updated');
            setModalOpen(false);
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to update overflow configuration');
        } finally {
            setSavingConfig(false);
        }
    };

    // Sort horizons chronologically (1h, 3h, 6h)
    const sortedForecasts = [...forecasts].sort((a, b) => (a.horizonHours ?? 0) - (b.horizonHours ?? 0));

    // Construct chart series combining current status and forecasts
    const chartData = [];
    if (dam?.currentWaterLevel != null) {
        chartData.push({
            label: 'Now',
            p10: dam.currentWaterLevel,
            p50: dam.currentWaterLevel,
            p90: dam.currentWaterLevel,
        });
    }
    sortedForecasts.forEach((fc) => {
        if (fc.predictedLevelP50 != null) {
            chartData.push({
                label: `+${fc.horizonHours}h`,
                p10: fc.predictedLevelP10 ?? fc.predictedLevelP50,
                p50: fc.predictedLevelP50,
                p90: fc.predictedLevelP90 ?? fc.predictedLevelP50,
                overflowProb: fc.overflowProbability != null ? (fc.overflowProbability * 100).toFixed(1) : null,
            });
        }
    });

    const dangerLevel = dam?.dangerWaterLevelMeters || overflowConfig?.crestLevelMeters;
    const overflowLevel = overflowConfig?.overflowThresholdMeters;

    if (loading) {
        return (
            <Paper className="p-8 text-center" sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <CircularProgress size={36} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    Loading machine learning forecasts and overflow thresholds...
                </Typography>
            </Paper>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Top Toolbar */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <AutoGraphRounded sx={{ color: 'primary.main', fontSize: 28 }} />
                    <div>
                        <Typography variant="h6" fontWeight={700}>
                            Multi-Horizon AI Forecast
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            CatBoost MultiQuantile regression (P10/P50/P90) & calibrated overflow risk
                        </Typography>
                    </div>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {sortedForecasts.length > 0 && (
                        <Chip
                            size="small"
                            label={sortedForecasts[0].dataFreshness?.toUpperCase() || 'FRESH'}
                            color={sortedForecasts[0].dataFreshness === 'fresh' ? 'success' : sortedForecasts[0].dataFreshness === 'stale' ? 'warning' : 'default'}
                            variant="outlined"
                        />
                    )}
                    <Button
                        size="small"
                        variant="outlined"
                        startIcon={<RefreshRounded />}
                        onClick={loadData}
                        sx={{ borderRadius: 2 }}
                    >
                        Refresh
                    </Button>
                    <Button
                        size="small"
                        variant="contained"
                        startIcon={<EditRounded />}
                        onClick={() => setModalOpen(true)}
                        sx={{ borderRadius: 2 }}
                    >
                        Overflow Config
                    </Button>
                </Box>
            </Box>

            {/* 3 Multi-Horizon Cards */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2.5 }}>
                {[1, 3, 6].map((horizon) => {
                    const fc = sortedForecasts.find((f) => f.horizonHours === horizon);
                    const p50 = fc?.predictedLevelP50 != null ? Number(fc.predictedLevelP50).toFixed(2) : '—';
                    const p10 = fc?.predictedLevelP10 != null ? Number(fc.predictedLevelP10).toFixed(2) : null;
                    const p90 = fc?.predictedLevelP90 != null ? Number(fc.predictedLevelP90).toFixed(2) : null;
                    const prob = fc?.overflowProbability != null ? Number(fc.overflowProbability * 100) : null;

                    let riskColor = 'success';
                    let riskText = 'Low Risk';
                    if (prob != null) {
                        if (prob >= 50) {
                            riskColor = 'error';
                            riskText = 'High Risk';
                        } else if (prob >= 20) {
                            riskColor = 'warning';
                            riskText = 'Elevated Risk';
                        }
                    }

                    return (
                        <Paper
                            key={horizon}
                            elevation={0}
                            sx={{
                                p: 2.5,
                                borderRadius: 3,
                                border: '1px solid',
                                borderColor: 'divider',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 2,
                                position: 'relative',
                                overflow: 'hidden',
                                '&:hover': { boxShadow: 2 },
                            }}
                        >
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Chip
                                    size="small"
                                    label={`+${horizon} Hour Horizon`}
                                    sx={{ fontWeight: 600, backgroundColor: 'primary.50', color: 'primary.main' }}
                                />
                                {prob != null ? (
                                    <Chip size="small" label={riskText} color={riskColor} variant="filled" />
                                ) : (
                                    <Chip size="small" label="Probability N/A" variant="outlined" />
                                )}
                            </Box>

                            {/* P50 Water Level */}
                            <div>
                                <Typography variant="caption" color="text.secondary">
                                    Central Water Level (P50)
                                </Typography>
                                <Typography variant="h4" fontWeight={800} color="text.primary">
                                    {p50} <span style={{ fontSize: '1rem', fontWeight: 500 }}>m</span>
                                </Typography>
                                {p10 && p90 ? (
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                        80% Confidence Interval: <b>{p10} m</b> — <b>{p90} m</b>
                                    </Typography>
                                ) : (
                                    <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
                                        Bounds unavailable
                                    </Typography>
                                )}
                            </div>

                            {/* Overflow Probability Bar */}
                            <Box sx={{ mt: 'auto' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                    <Typography variant="caption" fontWeight={600} color="text.secondary">
                                        Overflow Exceedance Risk
                                    </Typography>
                                    <Typography variant="caption" fontWeight={700} color={prob != null && prob >= 20 ? `${riskColor}.main` : 'text.primary'}>
                                        {prob != null ? `${prob.toFixed(1)}%` : 'Gated / Insufficient events'}
                                    </Typography>
                                </Box>
                                <LinearProgress
                                    variant="determinate"
                                    value={prob != null ? Math.min(prob, 100) : 0}
                                    color={riskColor}
                                    sx={{ height: 8, borderRadius: 4 }}
                                />
                            </Box>
                        </Paper>
                    );
                })}
            </Box>

            {/* Trajectory Chart */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <div>
                        <Typography variant="subtitle1" fontWeight={700}>
                            Water Level Uncertainty Projection
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Solid line represents central P50 estimate; shaded envelope denotes P10–P90 nominal 80% interval
                        </Typography>
                    </div>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        {dangerLevel && (
                            <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 600 }}>
                                ── Danger: {dangerLevel}m
                            </Typography>
                        )}
                        {overflowLevel && (
                            <Typography variant="caption" sx={{ color: 'warning.main', fontWeight: 600 }}>
                                ── Overflow: {overflowLevel}m
                            </Typography>
                        )}
                    </Box>
                </Box>

                {chartData.length > 0 ? (
                    <Box sx={{ width: '100%', height: 260 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="pInterval" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="label" stroke="#888888" fontSize={12} />
                                <YAxis
                                    domain={['auto', 'auto']}
                                    stroke="#888888"
                                    fontSize={12}
                                    unit="m"
                                />
                                <RechartsTooltip
                                    formatter={(val, name) => [`${val} m`, name === 'p50' ? 'P50 (Median)' : name === 'p90' ? 'P90 (Upper)' : 'P10 (Lower)']}
                                />
                                {dangerLevel && <ReferenceLine y={dangerLevel} stroke="#ef4444" strokeDasharray="4 4" />}
                                {overflowLevel && <ReferenceLine y={overflowLevel} stroke="#f59e0b" strokeDasharray="4 4" />}
                                <Area type="monotone" dataKey="p90" stroke="transparent" fill="url(#pInterval)" />
                                <Area type="monotone" dataKey="p10" stroke="transparent" fill="#ffffff" />
                                <Line type="monotone" dataKey="p50" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Box>
                ) : (
                    <Box sx={{ p: 4, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                            No forecast data points available for this dam.
                        </Typography>
                    </Box>
                )}
            </Paper>

            {/* Verified Overflow Configuration Summary Card */}
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ShieldRounded sx={{ color: 'primary.main' }} />
                        <Typography variant="subtitle1" fontWeight={700}>
                            Verified Overflow & Crest Configuration
                        </Typography>
                    </Box>
                    {overflowConfig?.version && (
                        <Chip size="small" label={`Version ${overflowConfig.version}`} variant="outlined" />
                    )}
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' }, gap: 2 }}>
                    <Box sx={{ p: 1.5, backgroundColor: 'grey.50', borderRadius: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                            Crest Elevation
                        </Typography>
                        <Typography variant="h6" fontWeight={700}>
                            {overflowConfig?.crestLevelMeters != null ? `${overflowConfig.crestLevelMeters} m` : '—'}
                        </Typography>
                    </Box>
                    <Box sx={{ p: 1.5, backgroundColor: 'grey.50', borderRadius: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                            Overflow Threshold
                        </Typography>
                        <Typography variant="h6" fontWeight={700} color="warning.main">
                            {overflowConfig?.overflowThresholdMeters != null ? `${overflowConfig.overflowThresholdMeters} m` : '—'}
                        </Typography>
                    </Box>
                    <Box sx={{ p: 1.5, backgroundColor: 'grey.50', borderRadius: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                            Freeboard Safety Buffer
                        </Typography>
                        <Typography variant="h6" fontWeight={700}>
                            {overflowConfig?.freeboardBufferMeters != null ? `${overflowConfig.freeboardBufferMeters} m` : '—'}
                        </Typography>
                    </Box>
                    <Box sx={{ p: 1.5, backgroundColor: 'grey.50', borderRadius: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                            Effective As Of
                        </Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5 }}>
                            {overflowConfig?.effectiveFrom ? new Date(overflowConfig.effectiveFrom).toLocaleDateString() : 'Active'}
                        </Typography>
                    </Box>
                </Box>
            </Paper>

            {/* Modal to Update Overflow Configuration */}
            <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth>
                <form onSubmit={handleSaveConfig}>
                    <DialogTitle fontWeight={700}>Update Dam Overflow Configuration</DialogTitle>
                    <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                            Creating a new overflow configuration version sets the verified spillway crest and threshold parameters used by the AI overflow risk model.
                        </Typography>
                        <TextField
                            label="Crest Level (meters)"
                            type="number"
                            inputProps={{ step: '0.1' }}
                            required
                            fullWidth
                            value={form.crestLevelMeters}
                            onChange={(e) => setForm({ ...form, crestLevelMeters: e.target.value })}
                        />
                        <TextField
                            label="Verified Overflow Threshold (meters)"
                            type="number"
                            inputProps={{ step: '0.1' }}
                            required
                            fullWidth
                            value={form.overflowThresholdMeters}
                            onChange={(e) => setForm({ ...form, overflowThresholdMeters: e.target.value })}
                        />
                        <TextField
                            label="Freeboard Buffer (meters)"
                            type="number"
                            inputProps={{ step: '0.1' }}
                            fullWidth
                            value={form.freeboardBufferMeters}
                            onChange={(e) => setForm({ ...form, freeboardBufferMeters: e.target.value })}
                        />
                        <TextField
                            label="Definition / Engineering Notes"
                            multiline
                            rows={3}
                            fullWidth
                            value={form.definitionNotes}
                            onChange={(e) => setForm({ ...form, definitionNotes: e.target.value })}
                            placeholder="e.g. Verified by Irrigation Dept Hydrological Engineering Survey..."
                        />
                    </DialogContent>
                    <DialogActions sx={{ p: 2.5 }}>
                        <Button onClick={() => setModalOpen(false)} color="inherit">
                            Cancel
                        </Button>
                        <Button type="submit" variant="contained" disabled={savingConfig}>
                            {savingConfig ? 'Saving...' : 'Save Configuration'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </Box>
    );
}

