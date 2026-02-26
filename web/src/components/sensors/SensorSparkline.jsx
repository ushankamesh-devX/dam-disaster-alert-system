import { useEffect, useRef, useState } from 'react';
import {
    ResponsiveContainer, LineChart, Line, Tooltip, ReferenceLine,
} from 'recharts';
import { getSensorReadings } from '../../services/sensor.service';

/**
 * Tiny sparkline chart for a single sensor.
 * Loads readings lazily — only when it scrolls into view.
 *
 * Props:
 *   sensorId          – numeric sensor ID
 *   warningThreshold  – optional, draws an amber reference line
 *   criticalThreshold – optional, draws a red reference line
 *   unit              – display unit string (e.g. "m", "mm/hr")
 */
export default function SensorSparkline({ sensorId, warningThreshold, criticalThreshold, unit }) {
    const [data, setData] = useState(null);  // null = not fetched yet
    const [error, setError] = useState(false);
    const containerRef = useRef(null);
    const fetchedRef = useRef(false);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !fetchedRef.current) {
                    fetchedRef.current = true;
                    getSensorReadings(sensorId, 0, 30)
                        .then(page => {
                            const rows = (page.content ?? []).slice().reverse(); // oldest → newest
                            setData(rows.map(r => ({ v: Number(r.readingValue) })));
                        })
                        .catch(() => setError(true));
                }
            },
            { threshold: 0.1 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [sensorId]);

    // Determine line colour based on latest value vs thresholds
    const latest = data?.[data.length - 1]?.v;
    const lineColor =
        criticalThreshold != null && latest >= Number(criticalThreshold) ? '#ef4444' :
            warningThreshold != null && latest >= Number(warningThreshold) ? '#f59e0b' :
                '#3b82f6';

    return (
        <div ref={containerRef} style={{ width: 110, height: 36 }}>
            {data === null && !error && (
                // placeholder shimmer while loading
                <div className="w-full h-full rounded animate-pulse bg-gray-100" />
            )}
            {error && (
                <span className="text-[10px] text-gray-300 italic">no data</span>
            )}
            {data !== null && !error && data.length === 0 && (
                <span className="text-[10px] text-gray-300 italic">no readings</span>
            )}
            {data !== null && !error && data.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                        {/* No CartesianGrid, XAxis, YAxis, or Legend — pure sparkline */}
                        {warningThreshold != null && (
                            <ReferenceLine y={Number(warningThreshold)} stroke="#f59e0b" strokeDasharray="3 2" strokeWidth={1} />
                        )}
                        {criticalThreshold != null && (
                            <ReferenceLine y={Number(criticalThreshold)} stroke="#ef4444" strokeDasharray="3 2" strokeWidth={1} />
                        )}
                        <Tooltip
                            contentStyle={{ fontSize: 10, padding: '3px 7px', borderRadius: 6, border: '1px solid #e5e7eb' }}
                            formatter={v => [`${Number(v).toFixed(2)} ${unit || ''}`, 'Reading']}
                            labelFormatter={() => ''}
                        />
                        <Line
                            type="monotone"
                            dataKey="v"
                            stroke={lineColor}
                            strokeWidth={1.8}
                            dot={false}
                            activeDot={{ r: 3 }}
                            connectNulls
                            isAnimationActive={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
            )}
        </div>
    );
}
