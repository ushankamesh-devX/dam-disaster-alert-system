import apiClient from '../lib/axios';

const SystemSafeLocationsService = {
    async list() {
        const res = await apiClient.get('/api/v1/system-safe-locations/list');
        return res.data;
    },

    async bulkUpsert(items) {
        const res = await apiClient.post('/api/v1/system-safe-locations/bulk-upsert', { items });
        return res.data;
    },

    async deleteByUuid(uuid) {
        const res = await apiClient.delete(`/api/v1/system-safe-locations/uuid/${encodeURIComponent(uuid)}`);
        return res.data;
    },
};

export default SystemSafeLocationsService;
