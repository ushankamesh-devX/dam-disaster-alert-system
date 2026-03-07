import apiClient from '../lib/axios';

/**
 * Alert API Service
 * Handles all alert-related backend HTTP communications.
 * Aligned with "Perfect & Complex" Alert System.
 */

export const getAlertById = async (id) => {
    const response = await apiClient.get(`/alerts/${id}`);
    return response.data?.data;
};

export const getAlertByUuid = async (uuid) => {
    const response = await apiClient.get(`/alerts/uuid/${uuid}`);
    return response.data?.data;
};

// Comprehensive list (non-paginated, optional usage)
export const getAllAlerts = async () => {
    const response = await apiClient.get('/alerts/list-all'); // Assuming this exists or falls back
    return response.data?.data;
};

export const getAllAlertsPaginated = async (params) => {
    const response = await apiClient.get('/alerts', { params });
    return response.data?.data;
};

export const createAlert = async (payload) => {
    const response = await apiClient.post('/alerts', payload);
    return response.data?.data;
};

export const updateAlert = async (id, payload) => {
    const response = await apiClient.put(`/alerts/${id}`, payload);
    return response.data?.data;
};

// Alias for AlertsPage.jsx
export const updateAlertStatus = async (id, status) => {
    const response = await apiClient.patch(`/alerts/${id}/status?status=${status}`);
    return response.data?.data;
};

export const resolveAlert = async (id, notes = '') => {
    const response = await apiClient.patch(`/alerts/${id}/resolve?notes=${encodeURIComponent(notes)}`);
    return response.data?.data;
};

export const escalateAlert = async (id, reason = '') => {
    const response = await apiClient.patch(`/alerts/${id}/escalate?reason=${encodeURIComponent(reason)}`);
    return response.data?.data;
};

export const deleteAlert = async (id) => {
    const response = await apiClient.delete(`/alerts/${id}`);
    return response.data?.data;
};

export const broadcastEmergency = async (payload) => {
    const response = await apiClient.post('/alerts/emergency-override', payload);
    return response.data?.data;
};

export const getAlertAnalytics = async () => {
    const response = await apiClient.get('/alerts/analytics');
    return response.data?.data;
};

// Alert Type Operations
export const getActiveAlertTypes = async () => {
    const response = await apiClient.get('/alert-types/active');
    return response.data?.data;
};

export const getAllAlertTypes = async () => {
    const response = await apiClient.get('/alert-types');
    return response.data?.data;
};

// Alias for AlertsPage.jsx
export const getAlertTypes = getAllAlertTypes;
