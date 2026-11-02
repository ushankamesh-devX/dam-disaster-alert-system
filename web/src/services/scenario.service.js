import apiClient from '../lib/axios';

const BASE = '/api/v1/demo/scenario';

/** Demo evacuation scenario runner: { running, action, startedAt, options, recorded, exitCode, log } */
const ScenarioService = {
    status: async () => (await apiClient.get(`${BASE}/status`)).data,
    start: async (dams, minutes, people) => (await apiClient.post(`${BASE}/start`, { dams, minutes, people })).data,
    stop: async () => (await apiClient.post(`${BASE}/stop`)).data,
    reset: async () => (await apiClient.post(`${BASE}/reset`)).data,
};

export default ScenarioService;
