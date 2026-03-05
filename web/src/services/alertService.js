import apiClient from '../lib/axios';

/**
 * Alert API Service
 * Handles all alert-related backend HTTP communications.
 */

// ─── Read ─────────────────────────────────────────────────────────────────────

/** Fetch a single alert by id or uuid (client-side filter — no GET /{id} endpoint). */
export const getAlertById = async (id) => {
    const response = await apiClient.get('/alerts/search');
    const alerts = response.data?.data || response.data || [];
    const alert = alerts.find(a => String(a.id) === String(id) || a.uuid === id);
    if (!alert) {
        const err = new Error('Not Found');
        err.response = { status: 404 };
        throw err;
    }
    return alert;
};

/** All currently-active alerts. */
export const getAllActiveAlerts = async () => {
    const response = await apiClient.get('/alerts/active');
    return response.data?.data || response.data || [];
};

/** All alerts regardless of status (search with empty params). */
export const getAllAlerts = async () => {
    const response = await apiClient.get('/alerts/search');
    return response.data?.data || response.data || [];
};

/** Search / filter alerts by optional status, severity, regionId. */
export const searchAlerts = async ({ status, severity, regionId } = {}) => {
    const params = {};
    if (status) params.status = status;
    if (severity) params.severity = severity;
    if (regionId) params.regionId = regionId;
    const response = await apiClient.get('/alerts/search', { params });
    return response.data?.data || response.data || [];
};

/** Active alerts for a specific dam. */
export const getActiveAlertsByDam = async (damId) => {
    const response = await apiClient.get(`/alerts/dam/${damId}`);
    return response.data?.data || response.data || [];
};

/** Regional alert statistics. */
export const getRegionalAlertStats = async (regionId) => {
    const response = await apiClient.get(`/alerts/stats/region/${regionId}`);
    return response.data?.data || response.data;
};

// ─── Analytics (Admin) ────────────────────────────────────────────────────────

/** Aggregated alert metrics for the admin dashboard. */
export const getAlertAnalytics = async () => {
    const response = await apiClient.get('/alerts/analytics');
    return response.data?.data || response.data;
};

// ─── Create / Broadcast ───────────────────────────────────────────────────────

/** Create a new alert. */
export const createAlert = async (payload) => {
    const response = await apiClient.post('/alerts', payload);
    return response.data?.data || response.data;
};

/** Broadcast emergency (forces severity=emergency, status=active). */
export const broadcastEmergency = async (payload) => {
    const response = await apiClient.post('/alerts/broadcast', payload);
    return response.data?.data || response.data;
};

/** Region-targeted broadcast. */
export const broadcastToRegion = async (regionId, payload) => {
    const response = await apiClient.post(`/alerts/broadcast/region/${regionId}`, payload);
    return response.data?.data || response.data;
};

/** Emergency override (SUPER_ADMIN — bypasses all queues). */
export const emergencyOverride = async (payload) => {
    const response = await apiClient.post('/alerts/emergency-override', payload);
    return response.data?.data || response.data;
};

/** Simulate dam-risk scenario. */
export const simulateDamRisk = async (damId, { alertTypeId = 1, regionId } = {}) => {
    const params = { alertTypeId };
    if (regionId) params.regionId = regionId;
    const response = await apiClient.post(`/alerts/simulate/${damId}`, null, { params });
    return response.data?.data || response.data;
};

// ─── Update ───────────────────────────────────────────────────────────────────

/** Update a single alert's status. */
export const updateAlertStatus = async (id, status) => {
    const response = await apiClient.patch(`/alerts/${id}/status`, { status });
    return response.data?.data || response.data;
};

/** Toggle simulation / drill mode on an alert. */
export const toggleSimulationMode = async (id, enable) => {
    const response = await apiClient.patch(`/alerts/${id}/simulation`, null, { params: { enable } });
    return response.data?.data || response.data;
};

// ─── Bulk Actions (Admin) ─────────────────────────────────────────────────────

/** Bulk resolve alerts matching criteria (damId and/or severity). */
export const bulkResolve = async ({ damId, severity } = {}) => {
    const response = await apiClient.patch('/alerts/bulk/resolve', { damId, severity });
    return response.data?.data || response.data || [];
};

/** Bulk escalate alerts matching criteria (damId and/or severity). */
export const bulkEscalate = async ({ damId, severity } = {}) => {
    const response = await apiClient.patch('/alerts/bulk/escalate', { damId, severity });
    return response.data?.data || response.data || [];
};

/** Bulk resolve by region / incidentRef (older endpoint). */
export const resolveBulkByRegion = async ({ regionId, incidentRef } = {}) => {
    const params = {};
    if (regionId) params.regionId = regionId;
    if (incidentRef) params.incidentRef = incidentRef;
    const response = await apiClient.patch('/alerts/resolve-bulk', null, { params });
    return response.data?.data || response.data || [];
};

