import { useEffect, useState, useCallback } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    Chip,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    CircularProgress,
    Tooltip,
} from '@mui/material';
import AutoGraphRounded from '@mui/icons-material/AutoGraphRounded';
import RefreshRounded from '@mui/icons-material/RefreshRounded';
import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded';
import UndoRounded from '@mui/icons-material/UndoRounded';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import ErrorOutlineRounded from '@mui/icons-material/ErrorOutlineRounded';
import HourglassEmptyRounded from '@mui/icons-material/HourglassEmptyRounded';
import StorageRounded from '@mui/icons-material/StorageRounded';
import MemoryRounded from '@mui/icons-material/MemoryRounded';
import SpeedRounded from '@mui/icons-material/SpeedRounded';
import ScheduleRounded from '@mui/icons-material/ScheduleRounded';
import AssessmentRounded from '@mui/icons-material/AssessmentRounded';
import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded';
import HighlightOffRounded from '@mui/icons-material/HighlightOffRounded';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded';
import TrendingUpRounded from '@mui/icons-material/TrendingUpRounded';
import ShowChartRounded from '@mui/icons-material/ShowChartRounded';
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded';
import {
    AreaChart,
    Area,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';
import toast from 'react-hot-toast';
import {
    getMlMonitoring,
    getMlReleases,
    getActiveRelease,
    updateActiveRelease,
    triggerRetrainingJob,
    runForecastCycle,
    getMlEvaluation,
} from '../../services/ml.service';
import { getAllDamsList } from '../../services/dam.service';

export default function MlAdminPage() {
    const [activeTab, setActiveTab] = useState('monitoring'); // monitoring | evaluation | jobs | releases
    const [loading, setLoading] = useState(true);
    const [monitoring, setMonitoring] = useState(null);
    const [releases, setReleases] = useState([]);
    const [activeRelease, setActiveRelease] = useState(null);
    const [runningForecast, setRunningForecast] = useState(false);

    // Real vs Predicted evaluation state
    const [evaluationData, setEvaluationData] = useState({ summary: null, points: [] });
    const [evalLoading, setEvalLoading] = useState(false);
    const [selectedDamId, setSelectedDamId] = useState(2);
    const [selectedHorizon, setSelectedHorizon] = useState('');
    const [damsList, setDamsList] = useState([]);

    // Model Release Metrics Inspection Dialog
    const [selectedReleaseForMetrics, setSelectedReleaseForMetrics] = useState(null);
    const [activateWarningOpen, setActivateWarningOpen] = useState(false);
    const [pendingReleaseId, setPendingReleaseId] = useState(null);

    // Job management
    const [jobs, setJobs] = useState([]);
    const [jobModalOpen, setJobModalOpen] = useState(false);
    const [triggeringJob, setTriggeringJob] = useState(false);
    const [jobForm, setJobForm] = useState({
        jobType: 'train',
        modelFamily: 'catboost',
        evaluationHorizon: '6',
    });

    // Rollback dialog
    const [rollbackOpen, setRollbackOpen] = useState(false);
    const [actingRelease, setActingRelease] = useState(false);

    const loadEvaluation = useCallback(async (damId = selectedDamId, horizon = selectedHorizon) => {
        setEvalLoading(true);
        try {
            const params = {};
            if (damId) params.damId = damId;
            if (horizon) params.horizon = horizon;
            const res = await getMlEvaluation(params);
            setEvaluationData(res || { summary: null, points: [] });
        } catch {
            // silent fail for evaluation preview
        } finally {
            setEvalLoading(false);
        }
    }, [selectedDamId, selectedHorizon]);

    const loadAllData = useCallback(async () => {
        setLoading(true);
        try {
            const [monRes, relRes, actRes, damsRes] = await Promise.allSettled([
                getMlMonitoring(),
                getMlReleases(),
                getActiveRelease(),
                getAllDamsList(),
            ]);

            if (monRes.status === 'fulfilled') {
                const mon = monRes.value?.data !== undefined && monRes.value?.success !== undefined ? monRes.value.data : monRes.value;
                setMonitoring(mon);
            }
            if (relRes.status === 'fulfilled') {
                const rel = relRes.value?.data !== undefined && relRes.value?.success !== undefined ? relRes.value.data : relRes.value;
                setReleases(Array.isArray(rel) ? rel : []);
            }
            if (actRes.status === 'fulfilled') {
                const act = actRes.value?.data !== undefined && actRes.value?.success !== undefined ? actRes.value.data : actRes.value;
                setActiveRelease(act);
            }
            if (damsRes.status === 'fulfilled') {
                const dams = damsRes.value?.data !== undefined && damsRes.value?.success !== undefined ? damsRes.value.data : damsRes.value;
                setDamsList(Array.isArray(dams) ? dams : []);
            }
            await loadEvaluation(selectedDamId, selectedHorizon);
        } catch {
            toast.error('Failed to load ML system status');
        } finally {
            setLoading(false);
        }
    }, [loadEvaluation, selectedDamId, selectedHorizon]);

    useEffect(() => {
        loadAllData();
    }, [loadAllData]);

    const handleTriggerJob = async (e) => {
        e.preventDefault();
        setTriggeringJob(true);
        try {
            const params = {
                model_family: jobForm.modelFamily,
                horizon: Number(jobForm.evaluationHorizon),
            };
            const res = await triggerRetrainingJob(jobForm.jobType, params);
            toast.success(`Job queued successfully: ID ${res.job_id || 'accepted'}`);
            setJobModalOpen(false);

            // Add to local jobs list for immediate feedback
            if (res.job_id) {
                const newJob = {
                    job_id: res.job_id,
                    job_type: jobForm.jobType,
                    status: 'PENDING',
                    created_at: new Date().toISOString(),
                };
                setJobs((prev) => [newJob, ...prev]);
            }
            loadAllData();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to trigger job');
        } finally {
            setTriggeringJob(false);
        }
    };

    const handleActivateRelease = async (releaseId) => {
        setActingRelease(true);
        try {
            await updateActiveRelease({ release_id: releaseId, action: 'activate' });
            toast.success(`Activated release: ${releaseId}`);
            loadAllData();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Activation failed');
        } finally {
            setActingRelease(false);
        }
    };

    const handleInitiateActivation = (release) => {
        if (!release.passed_gates) {
            setPendingReleaseId(release.release_id);
            setActivateWarningOpen(true);
        } else {
            handleActivateRelease(release.release_id);
        }
    };

    const handleRollback = async () => {
        setActingRelease(true);
        try {
            await updateActiveRelease({ action: 'rollback' });
            toast.success('Rolled back to previous stable release');
            setRollbackOpen(false);
            loadAllData();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Rollback failed');
        } finally {
            setActingRelease(false);
        }
    };

    const handleRunForecastCycle = async () => {
        setRunningForecast(true);
        try {
            const res = await runForecastCycle();
            toast.success(res?.message || 'Forecast cycle completed successfully!');
            await loadAllData();
        } catch (err) {
            toast.error(err?.response?.data?.message || err?.message || 'Failed to execute forecast cycle');
        } finally {
            setRunningForecast(false);
        }
    };

    const TABS = [
        { id: 'monitoring', label: 'Monitoring & Health' },
        { id: 'evaluation', label: 'Real vs Predicted' },
        { id: 'jobs', label: 'Retraining Jobs' },
        { id: 'releases', label: 'Model Releases' },
    ];

    if (loading && !monitoring) {
        return (
            <Paper className="p-12 text-center" sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <CircularProgress size={40} />
                <Typography variant="body1" sx={{ mt: 2 }} color="text.secondary">
                    Loading machine learning telemetry and pipeline status...
                </Typography>
            </Paper>
        );
    }

    const freshness = monitoring?.data_freshness || {};
    const jobStats = monitoring?.job_statistics || {};

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <AutoGraphRounded sx={{ fontSize: 32, color: 'primary.main' }} />
                    <div>
                        <Typography variant="h5" fontWeight={800}>
                            ML Operations & Model Governance
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            MultiQuantile regression models, Sigmoid calibrated overflow risk, and pipeline health
                        </Typography>
                    </div>
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshRounded />}
                        onClick={loadAllData}
                        sx={{ borderRadius: 2 }}
                    >
                        Refresh
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<OpenInNewRounded />}
                        href="http://localhost:5000"
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ borderRadius: 2 }}
                    >
                        MLflow Portal
                    </Button>
                    <Button
                        variant="contained"
                        color="secondary"
                        startIcon={runningForecast ? <CircularProgress size={18} color="inherit" /> : <ScheduleRounded />}
                        onClick={handleRunForecastCycle}
                        disabled={runningForecast}
                        sx={{ borderRadius: 2 }}
                    >
                        {runningForecast ? 'Predicting...' : 'Run Forecasts'}
                    </Button>
                    <Button
                        variant="outlined"
                        color="warning"
                        startIcon={<UndoRounded />}
                        onClick={() => setRollbackOpen(true)}
                        disabled={!activeRelease?.rollback_release_id}
                        sx={{ borderRadius: 2 }}
                    >
                        Rollback
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<PlayArrowRounded />}
                        onClick={() => setJobModalOpen(true)}
                        sx={{ borderRadius: 2 }}
                    >
                        Trigger Job
                    </Button>
                </Box>
            </Box>

            {/* Top Metric Cards */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2 }}>
                <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            ACTIVE RELEASE
                        </Typography>
                        <CheckCircleRounded sx={{ color: 'success.main', fontSize: 20 }} />
                    </Box>
                    <Typography variant="h6" fontWeight={700} noWrap title={activeRelease?.release_id || 'None'}>
                        {activeRelease?.release_id ? activeRelease.release_id.slice(0, 16) + '...' : 'None active'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {activeRelease?.metadata?.algorithm || 'CatBoost MultiQuantile'}
                    </Typography>
                </Paper>

                <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            STORAGE & VECTOR DB
                        </Typography>
                        <StorageRounded sx={{ color: 'primary.main', fontSize: 20 }} />
                    </Box>
                    <Typography variant="h6" fontWeight={700}>
                        Qdrant + MinIO
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        S3-compatible object storage & dense vectors
                    </Typography>
                </Paper>

                <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            TELEMETRY FRESHNESS
                        </Typography>
                        <SpeedRounded sx={{ color: 'info.main', fontSize: 20 }} />
                    </Box>
                    <Typography variant="h6" fontWeight={700}>
                        {freshness.fresh_dams_count ?? '—'} <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#10b981' }}>Fresh</span>
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {freshness.stale_dams_count ?? 0} stale / {freshness.unavailable_dams_count ?? 0} unavailable
                    </Typography>
                </Paper>

                <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            COMPLETED JOBS
                        </Typography>
                        <MemoryRounded sx={{ color: 'secondary.main', fontSize: 20 }} />
                    </Box>
                    <Typography variant="h6" fontWeight={700}>
                        {jobStats.completed_count ?? 0} <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#6b7280' }}>tasks</span>
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {jobStats.failed_count ?? 0} failures recorded
                    </Typography>
                </Paper>
            </Box>

            {/* Navigation Tabs */}
            <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                <Box sx={{ display: 'flex', borderBottom: '1px solid', borderColor: 'divider' }}>
                    {TABS.map((tab) => (
                        <Button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            sx={{
                                px: 3,
                                py: 1.75,
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                textTransform: 'none',
                                borderRadius: 0,
                                borderBottom: activeTab === tab.id ? '2px solid' : 'none',
                                borderColor: 'primary.main',
                                color: activeTab === tab.id ? 'primary.main' : 'text.secondary',
                            }}
                        >
                            {tab.label}
                        </Button>
                    ))}
                </Box>

                {/* Tab 1: Monitoring & Health */}
                {activeTab === 'monitoring' && (
                    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <div>
                            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                                Active Release Specifications
                            </Typography>
                            {activeRelease ? (
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
                                    <Box sx={{ p: 2, backgroundColor: 'grey.50', borderRadius: 2 }}>
                                        <Typography variant="caption" color="text.secondary">Full Release Tag</Typography>
                                        <Typography variant="body2" fontWeight={600} sx={{ wordBreak: 'break-all' }}>
                                            {activeRelease.release_id}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ p: 2, backgroundColor: 'grey.50', borderRadius: 2 }}>
                                        <Typography variant="caption" color="text.secondary">Horizons Supported</Typography>
                                        <Typography variant="body2" fontWeight={600}>
                                            1 Hour, 3 Hours, 6 Hours
                                        </Typography>
                                    </Box>
                                    <Box sx={{ p: 2, backgroundColor: 'grey.50', borderRadius: 2 }}>
                                        <Typography variant="caption" color="text.secondary">Rollback Target</Typography>
                                        <Typography variant="body2" fontWeight={600}>
                                            {activeRelease.rollback_release_id || 'None (Initial Release)'}
                                        </Typography>
                                    </Box>
                                </Box>
                            ) : (
                                <Typography variant="body2" color="text.secondary">
                                    No model release is currently active.
                                </Typography>
                            )}
                        </div>

                        <div>
                            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                                Dam Telemetry Freshness Status
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                {freshness.dam_freshness_details ? (
                                    Object.entries(freshness.dam_freshness_details).map(([damKey, status]) => (
                                        <Chip
                                            key={damKey}
                                            label={`Dam ${damKey}: ${status}`}
                                            color={status === 'fresh' ? 'success' : status === 'stale' ? 'warning' : 'default'}
                                            variant="outlined"
                                        />
                                    ))
                                ) : (
                                    <Typography variant="body2" color="text.secondary">
                                        All telemetry streams operational.
                                    </Typography>
                                )}
                            </Box>
                        </div>

                        {/* Forecast Automation & Scheduler Card */}
                        <div>
                            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                                Forecast Automation & Scheduling
                            </Typography>
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 2.5,
                                    borderRadius: 2,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    backgroundColor: 'grey.50',
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: 2,
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <ScheduleRounded sx={{ fontSize: 36, color: 'primary.main' }} />
                                    <div>
                                        <Typography variant="body1" fontWeight={700}>
                                            Spring Boot Hourly Forecast Cron
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Schedule: <code>0 0 * * * *</code> (Hourly at minute 0) • Targets: All operational dams • Horizons: +1h, +3h, +6h
                                        </Typography>
                                    </div>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Chip label="Cron: Active" color="success" size="small" variant="filled" />
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        size="small"
                                        startIcon={runningForecast ? <CircularProgress size={16} color="inherit" /> : <PlayArrowRounded />}
                                        onClick={handleRunForecastCycle}
                                        disabled={runningForecast}
                                        sx={{ borderRadius: 2 }}
                                    >
                                        {runningForecast ? 'Running Predictions...' : 'Run Forecast Cycle Now'}
                                    </Button>
                                </Box>
                            </Paper>
                        </div>
                    </Box>
                )}

                {/* Tab 2: Real vs Predicted (Forecast Verification) */}
                {activeTab === 'evaluation' && (
                    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {/* Filter & Controls Toolbar */}
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                            <div>
                                <Typography variant="subtitle1" fontWeight={700}>
                                    Real Telemetry vs. CatBoost Forecast Verification
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Continuous backtesting of historical predicted water levels (P10, P50, P90) against physical sensor ground truth
                                </Typography>
                            </div>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <FormControl size="small" sx={{ minWidth: 180 }}>
                                    <InputLabel>Selected Dam</InputLabel>
                                    <Select
                                        value={selectedDamId}
                                        label="Selected Dam"
                                        onChange={(e) => {
                                            const val = Number(e.target.value);
                                            setSelectedDamId(val);
                                            loadEvaluation(val, selectedHorizon);
                                        }}
                                    >
                                        {damsList.length > 0 ? (
                                            damsList.map((d) => (
                                                <MenuItem key={d.id} value={d.id}>
                                                    {d.name} {d.isMlEnabled ? '(ML Enabled)' : ''}
                                                </MenuItem>
                                            ))
                                        ) : (
                                            <MenuItem value={2}>Victoria Dam (Operational)</MenuItem>
                                        )}
                                    </Select>
                                </FormControl>

                                <FormControl size="small" sx={{ minWidth: 140 }}>
                                    <InputLabel>Forecast Horizon</InputLabel>
                                    <Select
                                        value={selectedHorizon}
                                        label="Forecast Horizon"
                                        onChange={(e) => {
                                            setSelectedHorizon(e.target.value);
                                            loadEvaluation(selectedDamId, e.target.value);
                                        }}
                                    >
                                        <MenuItem value="">All Horizons</MenuItem>
                                        <MenuItem value="1">1 Hour Ahead</MenuItem>
                                        <MenuItem value="3">3 Hours Ahead</MenuItem>
                                        <MenuItem value="6">6 Hours Ahead</MenuItem>
                                    </Select>
                                </FormControl>

                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={evalLoading ? <CircularProgress size={16} /> : <RefreshRounded />}
                                    onClick={() => loadEvaluation(selectedDamId, selectedHorizon)}
                                    disabled={evalLoading}
                                >
                                    Refresh
                                </Button>
                            </Box>
                        </Box>

                        {/* Status Notice Banner */}
                        {evaluationData?.summary?.isSimulatedBaseline && (
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 1.75,
                                    borderRadius: 2,
                                    border: '1px solid',
                                    borderColor: 'info.main',
                                    backgroundColor: 'info.lighter',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.5,
                                }}
                            >
                                <InfoOutlined sx={{ color: 'info.main', fontSize: 24 }} />
                                <div>
                                    <Typography variant="body2" fontWeight={600} color="info.dark">
                                        Cold-Start Telemetry Verification Mode
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Because automated forecasting was recently activated, future target times (+1h, +3h, +6h) are currently accumulating. Showing backtested verification against recent 48h water level sensors until forward prediction targets mature.
                                    </Typography>
                                </div>
                            </Paper>
                        )}

                        {/* Metric Scorecards */}
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2 }}>
                            <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                    OBSERVED MAE (MEAN ERROR)
                                </Typography>
                                <Typography variant="h5" fontWeight={800} sx={{ my: 0.5 }}>
                                    {evaluationData?.summary?.observedMaeMeters != null ? `${evaluationData.summary.observedMaeMeters} m` : '—'}
                                </Typography>
                                <Chip
                                    size="small"
                                    label={
                                        (evaluationData?.summary?.observedMaeMeters || 0) < 0.5
                                            ? 'Excellent Accuracy'
                                            : (evaluationData?.summary?.observedMaeMeters || 0) < 1.0
                                            ? 'Acceptable Variance'
                                            : 'Model Divergence'
                                    }
                                    color={
                                        (evaluationData?.summary?.observedMaeMeters || 0) < 0.5
                                            ? 'success'
                                            : (evaluationData?.summary?.observedMaeMeters || 0) < 1.0
                                            ? 'warning'
                                            : 'error'
                                    }
                                    variant="outlined"
                                />
                            </Paper>

                            <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                    OBSERVED RMSE (SPREAD)
                                </Typography>
                                <Typography variant="h5" fontWeight={800} sx={{ my: 0.5 }}>
                                    {evaluationData?.summary?.observedRmseMeters != null ? `${evaluationData.summary.observedRmseMeters} m` : '—'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Root mean squared standard error
                                </Typography>
                            </Paper>

                            <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                    80% QUANTILE INTERVAL HIT RATE
                                </Typography>
                                <Typography variant="h5" fontWeight={800} sx={{ my: 0.5, color: (evaluationData?.summary?.quantileCoverage80Pct || 0) >= 80 ? 'success.main' : 'warning.main' }}>
                                    {evaluationData?.summary?.quantileCoverage80Pct != null ? `${evaluationData.summary.quantileCoverage80Pct}%` : '—'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Target: ≥ 80.0% nominal coverage
                                </Typography>
                            </Paper>

                            <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                    VERIFIED TIMEPOINTS
                                </Typography>
                                <Typography variant="h5" fontWeight={800} sx={{ my: 0.5 }}>
                                    {evaluationData?.summary?.evaluatedCount ?? 0}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Matched with physical sensor readings
                                </Typography>
                            </Paper>
                        </Box>

                        {/* Interactive Recharts Verification Chart */}
                        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <div>
                                    <Typography variant="subtitle2" fontWeight={700}>
                                        Water Level Tracking: Actual vs. Forecast Ribbon (P10 – P50 – P90)
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Solid line indicates ground-truth sensor measurements; dashed curve represents median forecast; shaded area indicates 80% confidence interval
                                    </Typography>
                                </div>
                            </Box>

                            {evaluationData?.points?.length > 0 ? (
                                <ResponsiveContainer width="100%" height={320}>
                                    <AreaChart data={evaluationData.points} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="pIntervalGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                        <XAxis
                                            dataKey="targetTime"
                                            tickFormatter={(t) => (t ? new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '')}
                                            stroke="#9ca3af"
                                            fontSize={12}
                                        />
                                        <YAxis
                                            domain={['dataMin - 1', 'dataMax + 1']}
                                            tickFormatter={(v) => `${Number(v).toFixed(1)}m`}
                                            stroke="#9ca3af"
                                            fontSize={12}
                                        />
                                        <RechartsTooltip
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const d = payload[0].payload;
                                                    return (
                                                        <Paper sx={{ p: 1.5, fontSize: 12, borderRadius: 2, boxShadow: 3 }}>
                                                            <Typography variant="caption" fontWeight={700}>
                                                                Target: {new Date(d.targetTime).toLocaleString()} (+{d.horizonHours}h)
                                                            </Typography>
                                                            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                                <Typography variant="body2" sx={{ color: '#06b6d4', fontWeight: 600 }}>
                                                                    Actual Reading: {d.actualLevel} m
                                                                </Typography>
                                                                <Typography variant="body2" sx={{ color: '#8b5cf6', fontWeight: 600 }}>
                                                                    Predicted P50: {d.predictedP50} m
                                                                </Typography>
                                                                <Typography variant="caption" color="text.secondary">
                                                                    80% Interval: [{d.predictedP10}m — {d.predictedP90}m]
                                                                </Typography>
                                                                <Typography variant="caption" sx={{ color: d.withinInterval ? 'success.main' : 'warning.main', fontWeight: 600 }}>
                                                                    Variance: {d.errorMeters > 0 ? `+${d.errorMeters}` : d.errorMeters} m ({d.withinInterval ? 'Inside Ribbon' : 'Outside Ribbon'})
                                                                </Typography>
                                                            </Box>
                                                        </Paper>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Legend />
                                        <Area
                                            type="monotone"
                                            dataKey="predictedP90"
                                            stroke="#8b5cf6"
                                            strokeDasharray="2 2"
                                            fill="url(#pIntervalGrad)"
                                            name="P90 Upper Bound"
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="predictedP10"
                                            stroke="#8b5cf6"
                                            strokeDasharray="2 2"
                                            fill="#ffffff"
                                            name="P10 Lower Bound"
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="predictedP50"
                                            stroke="#8b5cf6"
                                            strokeWidth={2.5}
                                            strokeDasharray="5 5"
                                            dot={{ r: 3, fill: '#8b5cf6' }}
                                            name="Predicted Median (P50)"
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="actualLevel"
                                            stroke="#06b6d4"
                                            strokeWidth={3}
                                            dot={{ r: 4, fill: '#06b6d4' }}
                                            name="Actual Sensor Level"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
                                    <ShowChartRounded sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} />
                                    <Typography variant="body2">
                                        No forecast evaluation points recorded yet for this dam. Run a forecast cycle to begin collecting real-time points.
                                    </Typography>
                                </Box>
                            )}
                        </Paper>

                        {/* Detailed Table */}
                        <Paper elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                                <Typography variant="subtitle2" fontWeight={700}>
                                    Point-by-Point Ground Truth Verification Logs
                                </Typography>
                            </Box>
                            <Table size="small">
                                <TableHead sx={{ backgroundColor: 'grey.50' }}>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 600 }}>Target Timestamp</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Horizon</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Predicted P50</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Confidence Ribbon [P10 – P90]</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Actual Sensor</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Variance Error</TableCell>
                                        <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>Interval Coverage</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {evaluationData?.points?.length > 0 ? (
                                        evaluationData.points.map((pt, idx) => (
                                            <TableRow key={idx} hover>
                                                <TableCell>{new Date(pt.targetTime).toLocaleString()}</TableCell>
                                                <TableCell><Chip size="small" label={`+${pt.horizonHours}h`} variant="outlined" /></TableCell>
                                                <TableCell sx={{ fontWeight: 600, color: 'secondary.main' }}>{pt.predictedP50} m</TableCell>
                                                <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                                                    [{pt.predictedP10}m — {pt.predictedP90}m]
                                                </TableCell>
                                                <TableCell sx={{ fontWeight: 700, color: 'info.main' }}>{pt.actualLevel} m</TableCell>
                                                <TableCell sx={{ fontWeight: 600, color: Math.abs(pt.errorMeters) > 0.5 ? 'warning.main' : 'text.primary' }}>
                                                    {pt.errorMeters > 0 ? `+${pt.errorMeters}` : pt.errorMeters} m
                                                </TableCell>
                                                <TableCell sx={{ textAlign: 'center' }}>
                                                    {pt.withinInterval ? (
                                                        <Chip size="small" label="INSIDE" color="success" />
                                                    ) : (
                                                        <Chip size="small" label="OUTSIDE" color="warning" />
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={7} sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }}>
                                                No verification points available.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </Paper>
                    </Box>
                )}

                {/* Tab 2: Retraining Jobs */}
                {activeTab === 'jobs' && (
                    <Box sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="subtitle1" fontWeight={700}>
                                Asynchronous Training & Evaluation Jobs
                            </Typography>
                            <Button size="small" variant="contained" onClick={() => setJobModalOpen(true)}>
                                New Job
                            </Button>
                        </Box>

                        <Table>
                            <TableHead>
                                <TableRow sx={{ backgroundColor: 'grey.50' }}>
                                    <TableCell sx={{ fontWeight: 600 }}>Job ID</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Submitted At</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Details</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {jobs.length > 0 ? (
                                    jobs.map((job) => (
                                        <TableRow key={job.job_id} hover>
                                            <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{job.job_id}</TableCell>
                                            <TableCell sx={{ textTransform: 'uppercase' }}>{job.job_type}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    size="small"
                                                    label={job.status}
                                                    color={job.status === 'COMPLETED' ? 'success' : job.status === 'RUNNING' ? 'primary' : job.status === 'FAILED' ? 'error' : 'default'}
                                                />
                                            </TableCell>
                                            <TableCell>{new Date(job.created_at).toLocaleString()}</TableCell>
                                            <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                                                {job.error_message || 'In progress or completed'}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                                            No recent jobs recorded in current session. Click "Trigger Job" to queue a training task.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Box>
                )}

                {/* Tab 4: Model Releases */}
                {activeTab === 'releases' && (
                    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <Typography variant="subtitle1" fontWeight={700}>
                                    Model Release Governance & Operational Gate Scorecards
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Compare candidate models against persistence baselines to verify whether to activate or retrain
                                </Typography>
                            </div>
                            <Button
                                size="small"
                                variant="contained"
                                startIcon={<PlayArrowRounded />}
                                onClick={() => setJobModalOpen(true)}
                            >
                                Train New Candidate
                            </Button>
                        </Box>

                        <Table>
                            <TableHead>
                                <TableRow sx={{ backgroundColor: 'grey.50' }}>
                                    <TableCell sx={{ fontWeight: 600 }}>Release Version</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Gate Recommendation</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>1h MAE vs Base</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>6h MAE vs Base</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>80% Coverage</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                                    <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {releases.length > 0 ? (
                                    releases.map((rel) => {
                                        const isActive = rel.release_id === activeRelease?.release_id;
                                        const evalSum = rel.evaluation_summary || {};
                                        const lMetrics = evalSum.level_metrics || {};
                                        const m1 = lMetrics['1'] || {};
                                        const m6 = lMetrics['6'] || {};

                                        const passedGates = Boolean(rel.passed_gates);
                                        const m1Mae = m1.mae != null ? `${m1.mae.toFixed(2)}m` : '—';
                                        const m1Base = m1.baseline_mae != null ? `${m1.baseline_mae.toFixed(2)}m` : '—';
                                        const m6Mae = m6.mae != null ? `${m6.mae.toFixed(2)}m` : '—';
                                        const m6Base = m6.baseline_mae != null ? `${m6.baseline_mae.toFixed(2)}m` : '—';
                                        const coverage = m1.coverage_80 != null ? `${(m1.coverage_80 * 100).toFixed(1)}%` : '—';

                                        return (
                                            <TableRow key={rel.release_id} hover>
                                                <TableCell>
                                                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                                                        {rel.release_id}
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
                                                        <Chip size="small" label={rel.dataset_version ? `Data ${rel.dataset_version}` : 'v1.0.0'} sx={{ fontSize: 10, height: 18 }} />
                                                        <Typography variant="caption" color="text.secondary">
                                                            {rel.created_at ? new Date(rel.created_at).toLocaleDateString() : '—'}
                                                        </Typography>
                                                    </Box>
                                                </TableCell>

                                                <TableCell>
                                                    {passedGates ? (
                                                        <Box>
                                                            <Chip
                                                                size="small"
                                                                label="GATES PASSED"
                                                                color="success"
                                                                icon={<CheckCircleOutlineRounded />}
                                                            />
                                                            <Typography variant="caption" sx={{ color: 'success.main', display: 'block', fontWeight: 600, mt: 0.5 }}>
                                                                Safe to Activate
                                                            </Typography>
                                                        </Box>
                                                    ) : (
                                                        <Box>
                                                            <Chip
                                                                size="small"
                                                                label="GATES REJECTED"
                                                                color="error"
                                                                icon={<HighlightOffRounded />}
                                                            />
                                                            <Typography variant="caption" sx={{ color: 'error.main', display: 'block', mt: 0.5 }}>
                                                                Sub-baseline Accuracy
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                </TableCell>

                                                <TableCell>
                                                    <Typography variant="body2" fontWeight={600}>
                                                        {m1Mae}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Baseline: {m1Base}
                                                    </Typography>
                                                    {m1.mae_improvement_pct != null && (
                                                        <Typography
                                                            variant="caption"
                                                            sx={{
                                                                display: 'block',
                                                                fontWeight: 600,
                                                                color: m1.mae_improvement_pct >= 0 ? 'success.main' : 'error.main',
                                                            }}
                                                        >
                                                            {m1.mae_improvement_pct >= 0 ? `+${m1.mae_improvement_pct.toFixed(1)}%` : `${m1.mae_improvement_pct.toFixed(1)}%`}
                                                        </Typography>
                                                    )}
                                                </TableCell>

                                                <TableCell>
                                                    <Typography variant="body2" fontWeight={600}>
                                                        {m6Mae}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Baseline: {m6Base}
                                                    </Typography>
                                                    {m6.mae_improvement_pct != null && (
                                                        <Typography
                                                            variant="caption"
                                                            sx={{
                                                                display: 'block',
                                                                fontWeight: 600,
                                                                color: m6.mae_improvement_pct >= 0 ? 'success.main' : 'error.main',
                                                            }}
                                                        >
                                                            {m6.mae_improvement_pct >= 0 ? `+${m6.mae_improvement_pct.toFixed(1)}%` : `${m6.mae_improvement_pct.toFixed(1)}%`}
                                                        </Typography>
                                                    )}
                                                </TableCell>

                                                <TableCell>
                                                    <Typography variant="body2" fontWeight={700} sx={{ color: (m1.coverage_80 || 0) >= 0.8 ? 'success.main' : 'warning.main' }}>
                                                        {coverage}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Nominal 80%
                                                    </Typography>
                                                </TableCell>

                                                <TableCell>
                                                    {isActive ? (
                                                        <Chip size="small" label="ACTIVE" color="success" />
                                                    ) : (
                                                        <Chip size="small" label="STANDBY" variant="outlined" />
                                                    )}
                                                </TableCell>

                                                <TableCell sx={{ textAlign: 'right' }}>
                                                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            startIcon={<AssessmentRounded />}
                                                            onClick={() => setSelectedReleaseForMetrics(rel)}
                                                        >
                                                            Metrics
                                                        </Button>
                                                        {!isActive && (
                                                            <Button
                                                                size="small"
                                                                variant="contained"
                                                                color={passedGates ? 'primary' : 'warning'}
                                                                disabled={actingRelease}
                                                                onClick={() => handleInitiateActivation(rel)}
                                                            >
                                                                Activate
                                                            </Button>
                                                        )}
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                                            No releases found in model registry.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Box>
                )}
            </Paper>

            {/* Modal: Trigger Job */}
            <Dialog open={jobModalOpen} onClose={() => setJobModalOpen(false)} maxWidth="xs" fullWidth>
                <form onSubmit={handleTriggerJob}>
                    <DialogTitle fontWeight={700}>Trigger ML Job</DialogTitle>
                    <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
                        <FormControl fullWidth>
                            <InputLabel>Job Type</InputLabel>
                            <Select
                                value={jobForm.jobType}
                                label="Job Type"
                                onChange={(e) => setJobForm({ ...jobForm, jobType: e.target.value })}
                            >
                                <MenuItem value="train">Candidate Training & Evaluation</MenuItem>
                                <MenuItem value="evaluate">Evaluation Against Baseline</MenuItem>
                            </Select>
                        </FormControl>

                        <FormControl fullWidth>
                            <InputLabel>Model Candidate</InputLabel>
                            <Select
                                value={jobForm.modelFamily}
                                label="Model Candidate"
                                onChange={(e) => setJobForm({ ...jobForm, modelFamily: e.target.value })}
                            >
                                <MenuItem value="catboost">CatBoost MultiQuantile + Sigmoid Platt</MenuItem>
                                <MenuItem value="baseline">Persistence & Frequency Baseline</MenuItem>
                            </Select>
                        </FormControl>

                        <FormControl fullWidth>
                            <InputLabel>Max Horizon</InputLabel>
                            <Select
                                value={jobForm.evaluationHorizon}
                                label="Max Horizon"
                                onChange={(e) => setJobForm({ ...jobForm, evaluationHorizon: e.target.value })}
                            >
                                <MenuItem value="1">1 Hour</MenuItem>
                                <MenuItem value="3">3 Hours</MenuItem>
                                <MenuItem value="6">6 Hours</MenuItem>
                            </Select>
                        </FormControl>
                    </DialogContent>
                    <DialogActions sx={{ p: 2.5 }}>
                        <Button onClick={() => setJobModalOpen(false)} color="inherit">
                            Cancel
                        </Button>
                        <Button type="submit" variant="contained" disabled={triggeringJob}>
                            {triggeringJob ? 'Submitting...' : 'Queue Job'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>

            {/* Modal: Confirm Rollback */}
            <Dialog open={rollbackOpen} onClose={() => setRollbackOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle fontWeight={700}>Confirm Model Rollback</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                        Are you sure you want to rollback to the previous release (<b>{activeRelease?.rollback_release_id || 'previous'}</b>)?
                        Active inference will immediately switch to the earlier verified models.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setRollbackOpen(false)} color="inherit">
                        Cancel
                    </Button>
                    <Button variant="contained" color="warning" onClick={handleRollback} disabled={actingRelease}>
                        {actingRelease ? 'Rolling back...' : 'Confirm Rollback'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal: Detailed Model Metrics Scorecard */}
            <Dialog
                open={Boolean(selectedReleaseForMetrics)}
                onClose={() => setSelectedReleaseForMetrics(null)}
                maxWidth="md"
                fullWidth
            >
                {selectedReleaseForMetrics && (
                    <>
                        <DialogTitle sx={{ pb: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <Typography variant="h6" fontWeight={800}>
                                        Release Scorecard: {selectedReleaseForMetrics.release_id}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Registered: {selectedReleaseForMetrics.created_at ? new Date(selectedReleaseForMetrics.created_at).toLocaleString() : '—'} • Git: {selectedReleaseForMetrics.git_commit ? selectedReleaseForMetrics.git_commit.slice(0, 8) : 'HEAD'}
                                    </Typography>
                                </div>
                                <Chip
                                    label={selectedReleaseForMetrics.passed_gates ? 'GATES PASSED (RECOMMENDED)' : 'GATES FAILED (REJECTED)'}
                                    color={selectedReleaseForMetrics.passed_gates ? 'success' : 'error'}
                                    variant="filled"
                                />
                            </Box>
                        </DialogTitle>
                        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
                            {/* Decision Advisory Alert */}
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 2,
                                    borderRadius: 2,
                                    border: '1px solid',
                                    borderColor: selectedReleaseForMetrics.passed_gates ? 'success.main' : 'warning.main',
                                    backgroundColor: selectedReleaseForMetrics.passed_gates ? 'success.lighter' : 'warning.lighter',
                                }}
                            >
                                <Typography variant="subtitle2" fontWeight={700} sx={{ color: selectedReleaseForMetrics.passed_gates ? 'success.dark' : 'warning.dark' }}>
                                    {selectedReleaseForMetrics.passed_gates
                                        ? 'Production Activation Recommendation: APPROVED'
                                        : 'Production Activation Recommendation: REJECTED (Underperforming Baseline)'}
                                </Typography>
                                <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
                                    {selectedReleaseForMetrics.passed_gates
                                        ? 'This model candidate passed all operational release gates. Its mean error is superior to simple persistence, and its 80% confidence interval coverage meets production flood safety guidelines.'
                                        : 'This model candidate underperformed the persistence baseline on validation telemetry. Activating this candidate is not recommended without additional continuous training sensor readings.'}
                                </Typography>
                                {selectedReleaseForMetrics.evaluation_summary?.gate_reasons?.length > 0 && (
                                    <Box sx={{ mt: 1 }}>
                                        <Typography variant="caption" fontWeight={700} color="error.main">
                                            Gate Violations:
                                        </Typography>
                                        <ul style={{ margin: '4px 0 0 16px', padding: 0, fontSize: '0.8rem', color: '#b91c1c' }}>
                                            {selectedReleaseForMetrics.evaluation_summary.gate_reasons.map((r, i) => (
                                                <li key={i}>{r}</li>
                                            ))}
                                        </ul>
                                    </Box>
                                )}
                            </Paper>

                            {/* Level Forecaster Table */}
                            <div>
                                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                                    MultiQuantile Water Level Regressor Performance
                                </Typography>
                                <Table size="small">
                                    <TableHead sx={{ backgroundColor: 'grey.50' }}>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 600 }}>Horizon</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Samples</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Candidate MAE</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Baseline MAE</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Improvement %</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>RMSE</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>80% Coverage</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Gate Status</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {Object.entries(selectedReleaseForMetrics.evaluation_summary?.level_metrics || {}).map(([h, m]) => (
                                            <TableRow key={h}>
                                                <TableCell sx={{ fontWeight: 700 }}>+{h} Hours</TableCell>
                                                <TableCell>{m.sample_count}</TableCell>
                                                <TableCell sx={{ fontWeight: 600 }}>{m.mae?.toFixed(3)} m</TableCell>
                                                <TableCell sx={{ color: 'text.secondary' }}>{m.baseline_mae?.toFixed(3)} m</TableCell>
                                                <TableCell sx={{ fontWeight: 700, color: m.mae_improvement_pct >= 0 ? 'success.main' : 'error.main' }}>
                                                    {m.mae_improvement_pct >= 0 ? `+${m.mae_improvement_pct?.toFixed(1)}%` : `${m.mae_improvement_pct?.toFixed(1)}%`}
                                                </TableCell>
                                                <TableCell>{m.rmse?.toFixed(3)} m</TableCell>
                                                <TableCell sx={{ fontWeight: 600 }}>{((m.coverage_80 || 0) * 100).toFixed(1)}%</TableCell>
                                                <TableCell>
                                                    <Chip
                                                        size="small"
                                                        label={m.passed_gate ? 'PASS' : 'FAIL'}
                                                        color={m.passed_gate ? 'success' : 'error'}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Overflow Classifier Table */}
                            <div>
                                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                                    Calibrated Overflow Probability Classifier Performance
                                </Typography>
                                <Table size="small">
                                    <TableHead sx={{ backgroundColor: 'grey.50' }}>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 600 }}>Horizon</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Candidate Brier</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Baseline Brier</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>True Positives</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>False Positives</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Gate Status</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {Object.entries(selectedReleaseForMetrics.evaluation_summary?.overflow_metrics || {}).map(([h, m]) => (
                                            <TableRow key={h}>
                                                <TableCell sx={{ fontWeight: 700 }}>+{h} Hours</TableCell>
                                                <TableCell sx={{ fontWeight: 600 }}>{m.brier_score?.toFixed(4)}</TableCell>
                                                <TableCell sx={{ color: 'text.secondary' }}>{m.baseline_brier_score?.toFixed(4)}</TableCell>
                                                <TableCell>{m.true_positives ?? 0}</TableCell>
                                                <TableCell>{m.false_positives ?? 0}</TableCell>
                                                <TableCell>
                                                    <Chip
                                                        size="small"
                                                        label={m.passed_gate ? 'PASS' : 'FAIL'}
                                                        color={m.passed_gate ? 'success' : 'error'}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </DialogContent>
                        <DialogActions sx={{ p: 2 }}>
                            <Button onClick={() => setSelectedReleaseForMetrics(null)} color="inherit">
                                Close Scorecard
                            </Button>
                            {selectedReleaseForMetrics.release_id !== activeRelease?.release_id && (
                                <Button
                                    variant="contained"
                                    color={selectedReleaseForMetrics.passed_gates ? 'primary' : 'warning'}
                                    onClick={() => {
                                        const rel = selectedReleaseForMetrics;
                                        setSelectedReleaseForMetrics(null);
                                        handleInitiateActivation(rel);
                                    }}
                                >
                                    Activate This Release
                                </Button>
                            )}
                        </DialogActions>
                    </>
                )}
            </Dialog>

            {/* Modal: Safety Warning Confirmation when Activating Sub-Baseline Model */}
            <Dialog
                open={activateWarningOpen}
                onClose={() => setActivateWarningOpen(false)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'warning.main', fontWeight: 700 }}>
                    <WarningAmberRounded /> Operational Gate Warning
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mb: 1.5 }}>
                        This candidate model (<b>{pendingReleaseId}</b>) <b>failed automated quality gates</b> because its prediction error (MAE) did not outperform the persistence baseline on sparse data.
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        Activating this model in production may generate less accurate flood water level predictions. Are you sure you wish to override quality gates and activate it?
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setActivateWarningOpen(false)} color="inherit">
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="warning"
                        onClick={() => {
                            const rId = pendingReleaseId;
                            setActivateWarningOpen(false);
                            handleActivateRelease(rId);
                        }}
                    >
                        Override & Activate
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
