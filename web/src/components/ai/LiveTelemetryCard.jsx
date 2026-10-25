import React from 'react';
import {
    Box,
    Paper,
    Typography,
    LinearProgress,
    Chip,
    Grid,
    Button,
    Tooltip,
} from '@mui/material';
import {
    WaterDropRounded,
    WarningAmberRounded,
    SpeedRounded,
    LaunchRounded,
    StorageRounded,
    CloudQueueRounded,
    WavesRounded,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

/**
 * LiveTelemetryCard
 * Displays a real-time operational status card with water elevation gauge,
 * inflow/outflow balance, storage %, and hazard level.
 */
export default function LiveTelemetryCard({ telemetry, overflowConfig, damId }) {
    const navigate = useNavigate();

    if (!telemetry) return null;

    const currentLevel = telemetry.waterLevelMeters ?? 0;
    const frl = overflowConfig?.fullReservoirLevelMeters ?? telemetry.fullReservoirLevelMeters ?? 100;
    const dangerLevel = overflowConfig?.dangerLevelMeters ?? telemetry.dangerLevelMeters ?? (frl * 0.95);
    const storagePercent = telemetry.storagePercentage ?? (frl > 0 ? ((currentLevel / frl) * 100).toFixed(1) : 0);

    const percentOfFrl = Math.min(100, Math.max(0, (currentLevel / frl) * 100));
    const dangerPercent = Math.min(100, Math.max(0, (dangerLevel / frl) * 100));

    const hazardStatus = (telemetry.hazardStatus || 'normal').toLowerCase();
    const hazardColor =
        hazardStatus === 'critical' || hazardStatus === 'high'
            ? 'error'
            : hazardStatus === 'moderate' || hazardStatus === 'warning'
            ? 'warning'
            : 'success';

    return (
        <Paper
            elevation={0}
            sx={{
                p: 2,
                mt: 1.5,
                mb: 1.5,
                borderRadius: 2.5,
                border: '1px solid',
                borderColor: hazardStatus === 'normal' ? 'grey.300' : `${hazardColor}.main`,
                backgroundColor: '#ffffff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}
        >
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                        sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            backgroundColor: 'primary.50',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'primary.main',
                        }}
                    >
                        <WaterDropRounded sx={{ fontSize: 20 }} />
                    </Box>
                    <div>
                        <Typography variant="subtitle2" fontWeight={700}>
                            Live Reservoir Telemetry (Dam #{damId || telemetry.damId})
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Last reading: {telemetry.lastSensorReadingAt ? new Date(telemetry.lastSensorReadingAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Real-time'}
                        </Typography>
                    </div>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                        size="small"
                        color={hazardColor}
                        label={`Hazard: ${hazardStatus.toUpperCase()}`}
                        sx={{ fontWeight: 700, textTransform: 'uppercase' }}
                    />
                    {damId && (
                        <Button
                            size="small"
                            variant="outlined"
                            endIcon={<LaunchRounded sx={{ fontSize: 14 }} />}
                            onClick={() => navigate(`/admin/dams/${damId}`)}
                            sx={{ borderRadius: 1.5, textTransform: 'none', py: 0.25, px: 1, fontSize: '0.75rem' }}
                        >
                            View Dam
                        </Button>
                    )}
                </Box>
            </Box>

            {/* Water Level Gauge */}
            <Box sx={{ mb: 2, p: 1.5, backgroundColor: 'grey.50', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 0.75 }}>
                    <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            CURRENT WATER LEVEL
                        </Typography>
                        <Typography variant="h6" fontWeight={800} color={currentLevel >= dangerLevel ? 'error.main' : 'primary.main'}>
                            {currentLevel.toFixed(2)} m
                            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1, fontWeight: 500 }}>
                                ({storagePercent}% storage)
                            </Typography>
                        </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" color="text.secondary" display="block">
                            Danger: <strong>{dangerLevel.toFixed(1)}m</strong> | FRL: <strong>{frl.toFixed(1)}m</strong>
                        </Typography>
                    </Box>
                </Box>

                {/* Progress Bar with Danger Marker */}
                <Box sx={{ position: 'relative', pt: 0.5 }}>
                    <LinearProgress
                        variant="determinate"
                        value={percentOfFrl}
                        color={currentLevel >= dangerLevel ? 'error' : 'primary'}
                        sx={{ height: 10, borderRadius: 5, backgroundColor: 'grey.200' }}
                    />
                    {/* Danger level pin */}
                    <Tooltip title={`Danger Level: ${dangerLevel}m`} placement="top">
                        <Box
                            sx={{
                                position: 'absolute',
                                left: `${dangerPercent}%`,
                                top: 0,
                                bottom: 0,
                                width: '2px',
                                backgroundColor: 'error.main',
                                zIndex: 1,
                                transform: 'translateX(-50%)',
                            }}
                        />
                    </Tooltip>
                </Box>
            </Box>

            {/* Key Metrics Grid */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr 1fr' }, gap: 1 }}>
                <Paper elevation={0} sx={{ p: 1, border: '1px solid', borderColor: 'grey.200', borderRadius: 1.5, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                        <WavesRounded sx={{ fontSize: 14, color: 'info.main' }} /> Inflow
                    </Typography>
                    <Typography variant="subtitle2" fontWeight={700}>
                        {telemetry.inflowCumecs ?? 0} <span style={{ fontSize: '0.7em', color: 'gray' }}>m³/s</span>
                    </Typography>
                </Paper>

                <Paper elevation={0} sx={{ p: 1, border: '1px solid', borderColor: 'grey.200', borderRadius: 1.5, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                        <WavesRounded sx={{ fontSize: 14, color: 'primary.main' }} /> Outflow
                    </Typography>
                    <Typography variant="subtitle2" fontWeight={700}>
                        {telemetry.outflowCumecs ?? 0} <span style={{ fontSize: '0.7em', color: 'gray' }}>m³/s</span>
                    </Typography>
                </Paper>

                <Paper elevation={0} sx={{ p: 1, border: '1px solid', borderColor: 'grey.200', borderRadius: 1.5, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                        <SpeedRounded sx={{ fontSize: 14, color: 'warning.main' }} /> Spillway Gates
                    </Typography>
                    <Typography variant="subtitle2" fontWeight={700}>
                        {telemetry.gatesOpenCount ?? 0} / {telemetry.totalGatesCount ?? 1} Open
                    </Typography>
                </Paper>

                <Paper elevation={0} sx={{ p: 1, border: '1px solid', borderColor: 'grey.200', borderRadius: 1.5, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                        <CloudQueueRounded sx={{ fontSize: 14, color: 'info.main' }} /> Rain (24h)
                    </Typography>
                    <Typography variant="subtitle2" fontWeight={700}>
                        {telemetry.rainfallLast24hrMm ?? 0} <span style={{ fontSize: '0.7em', color: 'gray' }}>mm</span>
                    </Typography>
                </Paper>
            </Box>
        </Paper>
    );
}
