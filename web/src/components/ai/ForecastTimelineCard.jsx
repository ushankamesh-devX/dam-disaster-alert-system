import React from 'react';
import {
    Box,
    Paper,
    Typography,
    Chip,
} from '@mui/material';
import {
    TimelineRounded,
    TrendingUpRounded,
    WarningAmberRounded,
    CheckCircleRounded,
} from '@mui/icons-material';

/**
 * ForecastTimelineCard
 * Displays machine learning CatBoost water-level prediction horizons and overflow probabilities.
 */
export default function ForecastTimelineCard({ forecasts, damId }) {
    if (!forecasts || !Array.isArray(forecasts) || forecasts.length === 0) return null;

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
                        backgroundColor: 'info.50',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'info.main',
                    }}
                >
                    <TimelineRounded sx={{ fontSize: 20 }} />
                </Box>
                <div>
                    <Typography variant="subtitle2" fontWeight={700}>
                        ML CatBoost Forecast Horizons {damId ? `(Dam #${damId})` : ''}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        Forward water level predictions & overflow risk probabilities
                    </Typography>
                </div>
            </Box>

            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                        xs: '1fr',
                        sm: `repeat(${Math.min(forecasts.length, 5)}, 1fr)`,
                    },
                    gap: 1.5,
                }}
            >
                {forecasts.slice(0, 5).map((f, idx) => {
                    const horizon = f.horizonHours ?? f.horizon ?? (idx + 1) * 6;
                    const predLevel = (f.predictedWaterLevel ?? f.waterLevelMeters ?? 0).toFixed(2);
                    const riskProb = f.overflowProbability != null ? Number(f.overflowProbability) : 0;
                    const riskPercent = (riskProb * 100).toFixed(1);

                    const riskColor =
                        riskProb >= 0.4
                            ? 'error'
                            : riskProb >= 0.1
                            ? 'warning'
                            : 'success';

                    return (
                        <Paper
                            key={idx}
                            elevation={0}
                            sx={{
                                p: 1.5,
                                borderRadius: 2,
                                border: '1px solid',
                                borderColor: riskProb >= 0.4 ? 'error.light' : 'grey.200',
                                backgroundColor: riskProb >= 0.4 ? 'error.50' : 'grey.50',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                textAlign: 'center',
                                gap: 0.5,
                            }}
                        >
                            <Chip
                                size="small"
                                label={`+${horizon}h`}
                                sx={{
                                    fontWeight: 800,
                                    fontSize: '0.75rem',
                                    height: 22,
                                    backgroundColor: 'primary.main',
                                    color: '#ffffff',
                                }}
                            />
                            <Typography variant="subtitle1" fontWeight={800} sx={{ mt: 0.5 }}>
                                {predLevel} <span style={{ fontSize: '0.65em', color: 'gray' }}>m</span>
                            </Typography>
                            <Chip
                                size="small"
                                color={riskColor}
                                variant="outlined"
                                icon={riskProb >= 0.4 ? <WarningAmberRounded sx={{ fontSize: 14 }} /> : <CheckCircleRounded sx={{ fontSize: 14 }} />}
                                label={`${riskPercent}% Risk`}
                                sx={{
                                    fontWeight: 700,
                                    fontSize: '0.68rem',
                                    height: 20,
                                    mt: 0.5,
                                }}
                            />
                        </Paper>
                    );
                })}
            </Box>
        </Paper>
    );
}
