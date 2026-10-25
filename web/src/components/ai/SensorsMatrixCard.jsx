import React from 'react';
import {
    Box,
    Paper,
    Typography,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
} from '@mui/material';
import {
    SensorsRounded,
    WaterDropRounded,
    CloudQueueRounded,
    WavesRounded,
    ThermostatRounded,
    GrassRounded,
} from '@mui/icons-material';

function getSensorIcon(type) {
    const t = (type || '').toUpperCase();
    if (t.includes('WATER')) return <WaterDropRounded sx={{ fontSize: 16, color: 'primary.main' }} />;
    if (t.includes('RAIN')) return <CloudQueueRounded sx={{ fontSize: 16, color: 'info.main' }} />;
    if (t.includes('FLOW')) return <WavesRounded sx={{ fontSize: 16, color: 'primary.dark' }} />;
    if (t.includes('SOIL')) return <GrassRounded sx={{ fontSize: 16, color: 'success.main' }} />;
    if (t.includes('TEMP')) return <ThermostatRounded sx={{ fontSize: 16, color: 'error.main' }} />;
    return <SensorsRounded sx={{ fontSize: 16, color: 'grey.600' }} />;
}

/**
 * SensorsMatrixCard
 * Renders telemetry hardware sensor inventory with threshold parameters.
 */
export default function SensorsMatrixCard({ sensors, damId }) {
    if (!sensors || !Array.isArray(sensors) || sensors.length === 0) return null;

    return (
        <Paper
            elevation={0}
            sx={{
                p: 2,
                mt: 1.5,
                mb: 1.5,
                borderRadius: 2.5,
                border: '1px solid',
                borderColor: 'grey.300',
                backgroundColor: '#ffffff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Box
                    sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        backgroundColor: 'success.50',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'success.main',
                    }}
                >
                    <SensorsRounded sx={{ fontSize: 20 }} />
                </Box>
                <div>
                    <Typography variant="subtitle2" fontWeight={700}>
                        Hardware Sensors & Threshold Limits {damId ? `(Dam #${damId})` : ''}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {sensors.length} telemetry sensors monitored with automated alert triggers
                    </Typography>
                </div>
            </Box>

            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Table size="small">
                    <TableHead sx={{ backgroundColor: 'grey.100' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Sensor Name</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Unit</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Warning Limit</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Critical Limit</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {sensors.map((s, idx) => {
                            const sensorType = s.sensor_type || (typeof s.sensorType === 'object' ? s.sensorType?.code : s.sensorType) || 'Telemetry';
                            const unit = s.unit || '';
                            const warn = s.warning_threshold ?? s.warningThreshold ?? '-';
                            const crit = s.critical_threshold ?? s.criticalThreshold ?? '-';
                            const status = (s.status || 'active').toLowerCase();

                            return (
                                <TableRow key={s.id || s.sensor_id || idx} sx={{ '&:nth-of-type(even)': { backgroundColor: 'grey.50' } }}>
                                    <TableCell sx={{ py: 1 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            {getSensorIcon(sensorType)}
                                            <Typography variant="body2" fontWeight={600}>
                                                {s.name || `Sensor #${s.id || s.sensor_id}`}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell sx={{ py: 1 }}>
                                        <Chip size="small" label={sensorType} sx={{ fontSize: '0.7rem', height: 20 }} />
                                    </TableCell>
                                    <TableCell sx={{ py: 1, fontFamily: 'monospace' }}>{unit}</TableCell>
                                    <TableCell sx={{ py: 1, color: 'warning.dark', fontWeight: 600 }}>
                                        {warn} {unit}
                                    </TableCell>
                                    <TableCell sx={{ py: 1, color: 'error.main', fontWeight: 700 }}>
                                        {crit} {unit}
                                    </TableCell>
                                    <TableCell sx={{ py: 1 }}>
                                        <Chip
                                            size="small"
                                            color={status === 'active' ? 'success' : 'default'}
                                            label={status.toUpperCase()}
                                            sx={{ fontSize: '0.65rem', height: 18, fontWeight: 700 }}
                                        />
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
}
