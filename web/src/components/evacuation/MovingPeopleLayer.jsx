import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { personIcon, PERSON_COLORS } from './mapIcons';

const GLIDE_MS = 4500;   // a little under the 5 s poll, so people glide instead of jumping

/**
 * Individual (simulated) people as Leaflet markers managed directly, so they can glide between
 * updates. Optional fading trails and animated "flow" lines to each person's likely shelter.
 */
export default function MovingPeopleLayer({ people, shelters, selectedId, onSelect, showTrails, showFlows }) {
    const map = useMap();
    const items = useRef(new Map());   // id -> { marker, trail, flow, from, to, start }
    const onSelectRef = useRef(onSelect);
    useEffect(() => { onSelectRef.current = onSelect; });

    // One animation loop for every marker
    useEffect(() => {
        let frame;
        const tick = (now) => {
            items.current.forEach((it) => {
                const t = Math.min(1, (now - it.start) / GLIDE_MS);
                const lat = it.from[0] + (it.to[0] - it.from[0]) * t;
                const lng = it.from[1] + (it.to[1] - it.from[1]) * t;
                it.marker.setLatLng([lat, lng]);
                if (it.flow) {
                    const pts = it.flow.getLatLngs();
                    if (pts.length === 2) it.flow.setLatLngs([[lat, lng], pts[1]]);
                }
            });
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        const all = items.current;
        return () => {
            cancelAnimationFrame(frame);
            all.forEach((it) => { it.marker.remove(); it.trail?.remove(); it.flow?.remove(); });
            all.clear();
        };
    }, [map]);

    // Sync markers with the latest people list
    useEffect(() => {
        const seen = new Set();
        const shelterById = new Map((shelters || []).map((s) => [s.id, s]));
        const now = performance.now();
        for (const p of people) {
            seen.add(p.id);
            const selected = p.id === selectedId;
            let it = items.current.get(p.id);
            if (!it) {
                const marker = L.marker([p.lat, p.lng], { icon: personIcon(p.state, p.mode, p.headingDeg, selected), keyboard: false })
                    .on('click', () => onSelectRef.current?.(p.id))
                    .addTo(map);
                it = { marker, from: [p.lat, p.lng], to: [p.lat, p.lng], start: now };
                items.current.set(p.id, it);
            } else {
                const cur = it.marker.getLatLng();
                it.from = [cur.lat, cur.lng];
                it.to = [p.lat, p.lng];
                it.start = now;
            }
            it.marker.setIcon(personIcon(p.state, p.mode, p.headingDeg, selected));
            it.marker.setZIndexOffset(selected ? 2000 : p.state === 'danger' ? 500 : 0);
            it.marker.bindTooltip(`${p.name} · ${label(p)}`, { direction: 'top', offset: [0, -10] });

            const color = (PERSON_COLORS[p.state] || PERSON_COLORS.moving)[1];
            if (showTrails && p.trail?.length > 1) {
                const pts = p.trail.map(([lng, lat]) => [lat, lng]);
                if (it.trail) it.trail.setLatLngs(pts);
                else it.trail = L.polyline(pts, { color, weight: 2.5, opacity: 0.45, className: 'ddas-trail', interactive: false }).addTo(map);
            } else if (it.trail) { it.trail.remove(); it.trail = null; }

            const shelter = shelterById.get(p.shelterId);
            if ((showFlows || selected) && shelter && p.state !== 'safe') {
                const pts = [[p.lat, p.lng], [shelter.lat, shelter.lng]];
                if (it.flow) it.flow.setLatLngs(pts);
                else it.flow = L.polyline(pts, { color, weight: 1.5, opacity: 0.7, dashArray: '4 6', className: 'ddas-flow', interactive: false }).addTo(map);
            } else if (it.flow) { it.flow.remove(); it.flow = null; }
        }
        // Remove people no longer in the (filtered) list
        items.current.forEach((it, id) => {
            if (!seen.has(id)) { it.marker.remove(); it.trail?.remove(); it.flow?.remove(); items.current.delete(id); }
        });
    }, [map, people, shelters, selectedId, showTrails, showFlows]);

    return null;
}

function label(p) {
    if (p.state === 'safe') return `safe at ${p.shelterName || 'shelter'}`;
    if (p.state === 'sos') return 'SOS — waiting for help';
    const how = p.mode === 'drive' ? 'driving' : 'walking';
    return `${p.state === 'danger' ? 'in danger zone, ' : ''}${how}${p.etaMin != null ? ` · ~${p.etaMin} min to shelter` : ''}`;
}
