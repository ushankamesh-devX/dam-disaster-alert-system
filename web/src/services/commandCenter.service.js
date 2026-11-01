import apiClient from '../lib/axios';

const BASE = '/api/v1/command-center';

const CommandCenterService = {
    /** { summary, peopleCells, sos, services, timeline } */
    snapshot: async () => (await apiClient.get(`${BASE}/snapshot`)).data,
    acknowledge: (id) => apiClient.post(`${BASE}/sos/${id}/acknowledge`),
    assign: (id, providerId) => apiClient.post(`${BASE}/sos/${id}/assign`, { providerId }),
    resolve: (id, notes) => apiClient.post(`${BASE}/sos/${id}/resolve`, { notes }),
    /** Evacuation Order for a dam's zones; SMS only if the admin SMS switch is on. */
    broadcast: async (damId, title, message) => (await apiClient.post(`${BASE}/broadcast`, { damId, title, message })).data,
};

export default CommandCenterService;
