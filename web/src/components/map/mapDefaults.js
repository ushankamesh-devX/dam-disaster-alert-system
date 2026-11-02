import L from 'leaflet';
import { getAllDamsList } from '../../services/dam.service';

// Shared settings for every DDAS map: stay on Sri Lanka and zoom gently.

export const SRI_LANKA_CENTER = [7.8731, 80.7718];
export const SRI_LANKA_BOUNDS = L.latLngBounds([5.6, 79.2], [10.2, 82.2]);
export const DAM_ZOOM = 13;

/** Spread onto <MapContainer>. */
export const MAP_OPTIONS = {
    minZoom: 7,
    maxZoom: 18,
    maxBounds: SRI_LANKA_BOUNDS,
    maxBoundsViscosity: 1,      // can't drag off Sri Lanka
    zoomSnap: 0.5,
    zoomDelta: 0.5,             // +/- buttons move half a level
    wheelPxPerZoomLevel: 140,   // one wheel notch ≈ a quarter level (default 60 jumps much further)
    wheelDebounceTime: 60,
    scrollWheelZoom: false,     // enabled by MapBehavior after a click, so page scrolling isn't hijacked
};

/** Spread onto <TileLayer>. */
export const TILE_PROPS = {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxZoom: 18,
};

/** Active (not decommissioned) dams with coordinates; cached for the session. */
let damsPromise = null;
export function loadMapDams() {
    if (!damsPromise) {
        damsPromise = getAllDamsList()
            .then((list) => (list || []).filter((d) => d.status !== 'decommissioned'
                && Number.isFinite(Number(d.latitude)) && Number.isFinite(Number(d.longitude))))
            .catch(() => {
                damsPromise = null;
                return [];
            });
    }
    return damsPromise;
}

export function damsBounds(dams) {
    return L.latLngBounds(dams.map((d) => [Number(d.latitude), Number(d.longitude)]));
}
