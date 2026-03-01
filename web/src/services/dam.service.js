import apiClient from '../lib/axios';

// ── Dams ─────────────────────────────────────────────────────────────────────

/** GET /dams  → Page<DamListResponse> */
export const getDams = async (page = 0, size = 20) => {
    const r = await apiClient.get('/dams', { params: { page, size } });
    return r.data;
};

/** GET /dams/list  → List<DamListResponse> (all, no pagination) */
export const getAllDamsList = async () => {
    const r = await apiClient.get('/dams/list');
    return r.data;
};

// ── Hazard Levels ─────────────────────────────────────────────────────────────

/** GET /hazard-levels/list → List<HazardLevelResponse> */
export const getAllHazardLevelsList = async () => {
    const r = await apiClient.get('/hazard-levels/list');
    return r.data;
};

/** GET /dams/active  → List<DamListResponse> */
export const getActiveDams = async () => {
    const r = await apiClient.get('/dams/active');
    return r.data;
};

/** GET /dams/{id}  → DamResponse */
export const getDamById = async (id) => {
    const r = await apiClient.get(`/dams/${id}`);
    return r.data;
};

/** GET /dams/statistics  → { totalDams, activeDams } */
export const getDamStatistics = async () => {
    const r = await apiClient.get('/dams/statistics');
    return r.data;
};

/** GET /dams/statuses  → List<DamCurrentStatusResponse> */
export const getAllDamStatuses = async () => {
    const r = await apiClient.get('/dams/statuses');
    return r.data;
};

/** GET /dams/statuses/high-risk  → List<DamCurrentStatusResponse> */
export const getHighRiskDamStatuses = async () => {
    const r = await apiClient.get('/dams/statuses/high-risk');
    return r.data;
};

/** GET /dams/{id}/status  → DamCurrentStatusResponse */
export const getDamStatus = async (id) => {
    const r = await apiClient.get(`/dams/${id}/status`);
    return r.data;
};

/** GET /dams/filter?status&regionId&hazardStatus  → Page<DamListResponse> */
export const filterDams = async ({ status, regionId, hazardStatus, page = 0, size = 20 } = {}) => {
    const params = { page, size };
    if (status) params.status = status;
    if (regionId) params.regionId = regionId;
    if (hazardStatus) params.hazardStatus = hazardStatus;
    const r = await apiClient.get('/dams/filter', { params });
    return r.data;
};

/** GET /dams/search?q  → Page<DamListResponse> */
export const searchDams = async (q, page = 0, size = 20) => {
    const r = await apiClient.get('/dams/search', { params: { q, page, size } });
    return r.data;
};

/** POST /dams  → DamResponse (201) */
export const createDam = async (payload) => {
    const r = await apiClient.post('/dams', payload);
    return r.data;
};

/** PUT /dams/{id}  → DamResponse */
export const updateDam = async (id, payload) => {
    const r = await apiClient.put(`/dams/${id}`, payload);
    return r.data;
};

/** DELETE /dams/{id}  → 204 */
export const deleteDam = async (id) => {
    await apiClient.delete(`/dams/${id}`);
};

/** GET /dams/filter?regionId  → Page<DamListResponse> unwrapped to list */
export const getDamsByRegion = async (regionId) => {
    const r = await apiClient.get('/dams/filter', { params: { regionId, page: 0, size: 100 } });
    return r.data?.content ?? r.data ?? [];
};

// ── Dam Gates ─────────────────────────────────────────────────────────────────

/** GET /dams/{id}/gates  → List<DamGateResponse> */
export const getDamGates = async (damId) => {
    const r = await apiClient.get(`/dams/${damId}/gates`);
    return r.data;
};

/** POST /dams/gates  → DamGateResponse (201) */
export const createGate = async (payload) => {
    const r = await apiClient.post('/dams/gates', payload);
    return r.data;
};

/** PUT /dams/gates/{id}  → DamGateResponse */
export const updateGate = async (gateId, payload) => {
    const r = await apiClient.put(`/dams/gates/${gateId}`, payload);
    return r.data;
};

/** DELETE /dams/gates/{id}  → 204 */
export const deleteGate = async (gateId) => {
    await apiClient.delete(`/dams/gates/${gateId}`);
};

// ── Hazard Zones ──────────────────────────────────────────────────────────────

/** GET /dams/{id}/hazard-zones  → List<DamHazardZoneResponse> */
export const getDamHazardZones = async (damId) => {
    const r = await apiClient.get(`/dams/${damId}/hazard-zones`);
    return r.data;
};

/** POST /api/v1/dams/hazard-zones → DamHazardZoneResponse (201) */
export const createHazardZone = async (payload) => {
    const r = await apiClient.post('/dams/hazard-zones', payload);
    return r.data;
};

/** PUT /api/v1/dams/hazard-zones/{zoneId} → DamHazardZoneResponse */
export const updateHazardZone = async (zoneId, payload) => {
    const r = await apiClient.put(`/dams/hazard-zones/${zoneId}`, payload);
    return r.data;
};

/** DELETE /api/v1/dams/hazard-zones/{zoneId} → 204 */
export const deleteHazardZone = async (zoneId) => {
    await apiClient.delete(`/dams/hazard-zones/${zoneId}`);
};
