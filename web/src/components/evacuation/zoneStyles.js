// One fixed colour per hazard level, so levels are never confused whatever colour the data carries.
export const LEVEL_STYLE = {
    1: { fill: '#B91C1C', stroke: '#7F1D1D', opacity: 0.42, dash: null, label: 'L1 Extreme' },
    2: { fill: '#EA580C', stroke: '#9A3412', opacity: 0.36, dash: null, label: 'L2 High' },
    3: { fill: '#F59E0B', stroke: '#B45309', opacity: 0.3, dash: null, label: 'L3 Moderate' },
    4: { fill: '#EAB308', stroke: '#A16207', opacity: 0.2, dash: '6 4', label: 'L4 Low' },
    5: { fill: '#94A3B8', stroke: '#475569', opacity: 0.16, dash: '2 4', label: 'L5 Watch' },
};

export const FLOODED_STYLE = { fill: '#450A0A', stroke: '#450A0A', opacity: 0.62 };
