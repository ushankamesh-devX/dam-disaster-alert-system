// Fixed colour per hazard level (red → yellow → green), blue for water that has arrived.
// Matches api/scripts/build_river_zones.py.
export const LEVEL_STYLE = {
    1: { fill: '#DC2626', stroke: '#991B1B', opacity: 0.42, dash: null, label: 'L1 Extreme' },
    2: { fill: '#F97316', stroke: '#C2410C', opacity: 0.36, dash: null, label: 'L2 High' },
    3: { fill: '#EAB308', stroke: '#A16207', opacity: 0.32, dash: null, label: 'L3 Moderate' },
    4: { fill: '#FDE047', stroke: '#CA8A04', opacity: 0.26, dash: '6 4', label: 'L4 Low' },
    5: { fill: '#22C55E', stroke: '#15803D', opacity: 0.2, dash: '2 4', label: 'L5 Watch' },
};

export const FLOODED_STYLE = { fill: '#2563EB', stroke: '#1E40AF', opacity: 0.55 };

/** Flood front: minutes after release -> km down the river (same timing the zones use). */
const FRONT = [[0, 0], [15, 3], [40, 8], [80, 15], [140, 25], [210, 35]];

export function frontKm(minutes) {
    if (minutes <= 0) return 0;
    for (let i = 1; i < FRONT.length; i++) {
        const [t0, d0] = FRONT[i - 1];
        const [t1, d1] = FRONT[i];
        if (minutes <= t1) return d0 + ((d1 - d0) * (minutes - t0)) / (t1 - t0);
    }
    return FRONT[FRONT.length - 1][1];
}
