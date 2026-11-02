import apiClient from '../lib/axios';

const BASE = '/api/v1/command-center';

const CommandCenterService = {
    /** { summary, peopleCells, sos, services, timeline } */
    snapshot: async () => (await apiClient.get(`${BASE}/snapshot`)).data,
    /** Each simulated person: position, trail, state, mode, likely shelter, ETA. */
    people: async () => (await apiClient.get(`${BASE}/people`)).data,
    /** { zones, shelters, bottlenecks, stragglers, progress, incident } */
    analytics: async () => (await apiClient.get(`${BASE}/analytics`)).data,
    /** [{ t, p: [[id, lat, lng, safe], ...] }] every 15 s */
    replay: async (minutes = 60) => (await apiClient.get(`${BASE}/replay`, { params: { minutes } })).data,
    acknowledge: (id) => apiClient.post(`${BASE}/sos/${id}/acknowledge`),
    assign: (id, providerId) => apiClient.post(`${BASE}/sos/${id}/assign`, { providerId }),
    /** Dispatch one unit; a busy unit gets it in its queue. Returns { unit, queuePosition } */
    assignUnit: async (id, teamUserId) => (await apiClient.post(`${BASE}/sos/${id}/assign`, { teamUserId })).data,
    /** Take the job back from a unit. */
    unassign: (id, teamUserId) => apiClient.delete(`${BASE}/sos/${id}/teams/${teamUserId}`),
    /** Move a queued job: direction 'up' | 'down' */
    moveJob: (teamUserId, sosId, direction) => apiClient.post(`${BASE}/teams/${teamUserId}/queue/${sosId}/${direction}`),
    resolve: (id, notes) => apiClient.post(`${BASE}/sos/${id}/resolve`, { notes }),
    /** Response teams: status, live position, current mission. */
    teams: async () => (await apiClient.get(`${BASE}/teams`)).data,
    /** Teams ranked for one SOS (right kind, free, road time); best one has recommended: true. */
    recommend: async (sosId) => (await apiClient.get(`${BASE}/sos/${sosId}/teams`)).data,
    messages: async (sosId) => (await apiClient.get(`${BASE}/sos/${sosId}/messages`)).data,
    sendMessage: (sosId, text) => apiClient.post(`${BASE}/sos/${sosId}/messages`, { text }),
    /** To every team, or one kind: police | hospital | fire_brigade. Returns { sent } */
    teamBroadcast: async (text, type) => (await apiClient.post(`${BASE}/teams/broadcast`, { text, type: type || null })).data,
    /** End the real phones' sharing and SOS: { sessions, sos } */
    resetPhones: async () => (await apiClient.post(`${BASE}/phones/reset`)).data,
    /** Evacuation Order for a dam's zones; SMS only if the admin SMS switch is on. */
    broadcast: async (damId, title, message) => (await apiClient.post(`${BASE}/broadcast`, { damId, title, message })).data,
};

export default CommandCenterService;
