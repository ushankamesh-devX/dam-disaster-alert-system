import { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { DAM_ZOOM, damsBounds, loadMapDams } from './mapDefaults';

/**
 * Put inside <MapContainer> (with MAP_OPTIONS). Wheel zoom works only after a click on the map
 * (or while Ctrl is held), the map re-measures when its box changes, and zoom/pan starts are
 * reported so hover popups can close. With fitDams, the first view frames all active dams.
 */
export function MapBehavior({ fitDams = false, onViewChangeStart }) {
    const map = useMap();
    const onStart = useRef(onViewChangeStart);
    useEffect(() => { onStart.current = onViewChangeStart; });

    useEffect(() => {
        const container = map.getContainer();
        const activate = () => map.scrollWheelZoom.enable();
        const deactivate = () => map.scrollWheelZoom.disable();
        const ctrlWheel = (e) => {
            if (e.ctrlKey && !map.scrollWheelZoom.enabled()) {
                e.preventDefault();
                map.setZoom(map.getZoom() + (e.deltaY < 0 ? 0.5 : -0.5));
            }
        };
        map.on('click focus', activate);
        container.addEventListener('mouseleave', deactivate);
        container.addEventListener('wheel', ctrlWheel, { passive: false });

        const started = () => onStart.current?.();
        map.on('zoomstart movestart', started);

        // Leaflet only re-measures on window resize; also do it when the box changes (sidebar, grid)
        const observer = new ResizeObserver(() => map.invalidateSize({ pan: false }));
        observer.observe(container);

        return () => {
            map.off('click focus', activate);
            map.off('zoomstart movestart', started);
            container.removeEventListener('mouseleave', deactivate);
            container.removeEventListener('wheel', ctrlWheel);
            observer.disconnect();
        };
    }, [map]);

    useEffect(() => {
        if (!fitDams) return undefined;
        let cancelled = false;
        loadMapDams().then((dams) => {
            if (!cancelled && dams.length > 0) {
                map.fitBounds(damsBounds(dams), { padding: [60, 60], maxZoom: 11 });
            }
        });
        return () => { cancelled = true; };
    }, [map, fitDams]);

    return null;
}

/** "Go to dam" dropdown in the map's top-right corner. Put inside <MapContainer>. */
export function DamJumpControl({ onSelect }) {
    const map = useMap();
    const [dams, setDams] = useState([]);
    const [value, setValue] = useState('');
    const boxRef = useRef(null);

    useEffect(() => {
        let cancelled = false;
        loadMapDams().then((list) => { if (!cancelled) setDams(list); });
        return () => { cancelled = true; };
    }, []);

    // Clicks and scrolls on the dropdown must not reach the map underneath
    useEffect(() => {
        if (!boxRef.current) return;
        L.DomEvent.disableClickPropagation(boxRef.current);
        L.DomEvent.disableScrollPropagation(boxRef.current);
    }, [dams.length]);

    if (dams.length === 0) return null;

    const go = (e) => {
        const id = e.target.value;
        setValue(id);
        if (id === 'all') {
            map.flyToBounds(damsBounds(dams), { padding: [60, 60], maxZoom: 11, duration: 0.8 });
            return;
        }
        const dam = dams.find((d) => String(d.id) === id);
        if (!dam) return;
        map.flyTo([Number(dam.latitude), Number(dam.longitude)], DAM_ZOOM, { duration: 0.8 });
        onSelect?.(dam);
    };

    return (
        <div className="leaflet-top leaflet-right">
            <div ref={boxRef} className="leaflet-control" style={{ marginTop: 10, marginRight: 10 }}>
                <label className="sr-only" htmlFor="ddas-dam-jump">Go to dam</label>
                <select
                    id="ddas-dam-jump"
                    value={value}
                    onChange={go}
                    className="bg-white border border-gray-300 rounded-md px-2 py-1.5 text-sm text-gray-800 shadow-sm cursor-pointer"
                >
                    <option value="" disabled>Go to dam…</option>
                    <option value="all">All dams</option>
                    {dams.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
            </div>
        </div>
    );
}
