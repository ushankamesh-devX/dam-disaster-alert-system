import apiClient from '../lib/axios';

// Public evacuation endpoints live under /api/public, outside the /api/v1 base URL
const ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/api\/v1\/?$/, '');
const PUBLIC_BASE = `${ORIGIN}/api/public/evacuation`;

async function publicJson(path, options) {
    const res = await fetch(`${PUBLIC_BASE}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed (${res.status})`);
    }
    return res.json();
}

const EvacuationService = {
    status() {
        return publicJson('/status');
    },

    route(lat, lng, mode = 'walk') {
        return publicJson('/route', { method: 'POST', body: JSON.stringify({ lat, lng, mode }) });
    },

    /** Live updates. onStatus gets the same shape as status(); returns a close function. */
    subscribe(onStatus, onConnectionChange) {
        const source = new EventSource(`${PUBLIC_BASE}/stream`);
        source.addEventListener('status', (e) => {
            try {
                onStatus(JSON.parse(e.data));
            } catch {
                // ignore malformed event
            }
        });
        source.onopen = () => onConnectionChange?.(true);
        source.onerror = () => onConnectionChange?.(false);   // EventSource retries by itself
        return () => source.close();
    },

    async createBlockedRoad({ name, reason, geometry, expiresAt }) {
        const res = await apiClient.post('/api/v1/blocked-roads', {
            name,
            reason,
            boundaryGeojson: JSON.stringify(geometry),
            isActive: true,
            expiresAt: expiresAt || null,
        });
        return res.data;
    },

    async deleteBlockedRoad(id) {
        await apiClient.delete(`/api/v1/blocked-roads/${id}`);
    },

    async rebuildPacks() {
        const res = await apiClient.post('/api/v1/blocked-roads/rebuild-packs');
        return res.data;
    },
};

export default EvacuationService;
