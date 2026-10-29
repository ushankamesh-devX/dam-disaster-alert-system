import React from 'react';
import {
    Box,
    Paper,
    Typography,
    Chip,
} from '@mui/material';
import {
    ShowChartRounded,
    TrendingDownRounded,
    TrendingUpRounded,
    WarningAmberRounded,
    WaterDropRounded,
} from '@mui/icons-material';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ReferenceLine,
} from 'recharts';

function CustomChartTooltip({ active, payload }) {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <Paper
                elevation={3}
                sx={{
                    p: 1.25,
                    backgroundColor: '#1e293b',
                    color: '#ffffff',
                    borderRadius: 1.5,
                    fontSize: '0.75rem',
                    border: '1px solid #334155',
                }}
            >
                <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 0.5 }}>
                    {data.fullDate || data.date}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 800, color: '#38bdf8' }}>
                    Water Level: {data.waterLevel} m
                </Typography>
            </Paper>
        );
    }
    return null;
}

/**
 * WaterLevelTrendChartCard
 * Renders an interactive historical water level area chart with Danger and FRL reference thresholds.
 */
export default function WaterLevelTrendChartCard({ chartData }) {
    if (!chartData || chartData.type !== 'water_level_trend' || !chartData.timeSeries || chartData.timeSeries.length === 0) {
        return null;
    }

    const {
        damId,
        damName,
        days = 30,
        startLevel,
        currentLevel,
        netChange,
        minLevel,
        maxLevel,
        dangerLevel = 95,
        fullReservoirLevel = 100,
        timeSeries,
    } = chartData;

    // Format time series for Recharts
    const formattedData = timeSeries.map((pt) => {
        const d = new Date(pt.timestamp);
        return {
            date: d.toLocaleDateString([], { month: 'short', day: 'numeric' }),
            fullDate: d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
            waterLevel: pt.water_level_meters,
        };
    });

    const isDecreasing = netChange < 0;
    const netChangeAbs = Math.abs(netChange != null ? netChange : 0).toFixed(2);

    // Compute Y domain to show reference lines and data cleanly
    const allLevels = timeSeries.map((p) => p.water_level_meters).filter((v) => v != null);
    const dataMin = allLevels.length ? Math.min(...allLevels) : 60;
    const dataMax = allLevels.length ? Math.max(...allLevels) : 80;
    const yMin = Math.max(0, Math.floor(Math.min(dataMin, (dangerLevel || 95) * 0.7) - 5));
    const yMax = Math.ceil(Math.max(dataMax, dangerLevel || 95) + 5);

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
                        <ShowChartRounded sx={{ fontSize: 20 }} />
                    </Box>
                    <div>
                        <Typography variant="subtitle2" fontWeight={700}>
                            Water Level Trend — {damName || `Dam #${damId}`} (Past {days} Days)
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Continuous reservoir elevation trajectory & elevation thresholds
                        </Typography>
                    </div>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                        size="small"
                        icon={isDecreasing ? <TrendingDownRounded sx={{ fontSize: 16 }} /> : <TrendingUpRounded sx={{ fontSize: 16 }} />}
                        color={isDecreasing ? 'info' : 'warning'}
                        label={`Net: ${netChange > 0 ? '+' : ''}${netChange ?? 0} m`}
                        sx={{ fontWeight: 800, fontSize: '0.75rem' }}
                    />
                </Box>
            </Box>

            {/* Stat Badges */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr 1fr' }, gap: 1, mb: 2 }}>
                <Paper elevation={0} sx={{ p: 1, border: '1px solid', borderColor: 'grey.200', borderRadius: 1.5, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary">Start Level</Typography>
                    <Typography variant="subtitle2" fontWeight={700}>{startLevel ?? '—'} m</Typography>
                </Paper>
                <Paper elevation={0} sx={{ p: 1, border: '1px solid', borderColor: 'grey.200', borderRadius: 1.5, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary">Current Level</Typography>
                    <Typography variant="subtitle2" fontWeight={700} color="primary.main">{currentLevel ?? '—'} m</Typography>
                </Paper>
                <Paper elevation={0} sx={{ p: 1, border: '1px solid', borderColor: 'grey.200', borderRadius: 1.5, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary">Monthly High</Typography>
                    <Typography variant="subtitle2" fontWeight={700} color="warning.dark">{maxLevel ?? '—'} m</Typography>
                </Paper>
                <Paper elevation={0} sx={{ p: 1, border: '1px solid', borderColor: 'grey.200', borderRadius: 1.5, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary">Monthly Low</Typography>
                    <Typography variant="subtitle2" fontWeight={700} color="info.dark">{minLevel ?? '—'} m</Typography>
                </Paper>
            </Box>

            {/* Recharts Area Chart */}
            <Box sx={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="waterLevelGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 11, fill: '#64748b' }}
                            tickLine={false}
                            axisLine={{ stroke: '#cbd5e1' }}
                        />
                        <YAxis
                            domain={[yMin, yMax]}
                            tick={{ fontSize: 11, fill: '#64748b' }}
                            tickLine={false}
                            axisLine={false}
                            unit="m"
                        />
                        <Tooltip content={<CustomChartTooltip />} />

                        {/* Danger Level Marker */}
                        {dangerLevel && (
                            <ReferenceLine
                                y={dangerLevel}
                                stroke="#ef4444"
                                strokeDasharray="4 4"
                                strokeWidth={1.5}
                                label={{
                                    value: `Danger (${dangerLevel}m)`,
                                    fill: '#ef4444',
                                    fontSize: 10,
                                    position: 'insideTopRight',
                                }}
                            />
                        )}

                        {/* Full Reservoir Level Marker */}
                        {fullReservoirLevel && (
                            <ReferenceLine
                                y={fullReservoirLevel}
                                stroke="#3b82f6"
                                strokeDasharray="3 3"
                                strokeWidth={1}
                                label={{
                                    value: `FRL (${fullReservoirLevel}m)`,
                                    fill: '#3b82f6',
                                    fontSize: 10,
                                    position: 'insideTopRight',
                                }}
                            />
                        )}

                        <Area
                            type="monotone"
                            dataKey="waterLevel"
                            stroke="#0284c7"
                            strokeWidth={2.5}
                            fillOpacity={1}
                            fill="url(#waterLevelGrad)"
                            dot={{ r: 2.5, fill: '#0284c7' }}
                            activeDot={{ r: 5, fill: '#0369a1', stroke: '#ffffff', strokeWidth: 2 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </Box>
        </Paper>
    );
}
