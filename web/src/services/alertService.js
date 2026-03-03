import apiClient from '../lib/axios';

/**
 * Alert API Service
 * Handles all alert-related backend HTTP communications.
 */

// Uses the search endpoint and filters on the client side since GET /{id} isn't exposed
export const getAlertById = async (id) => {
    try {
        const response = await apiClient.get('/alerts/search');
        const alerts = response.data?.data || response.data || [];
        const alert = alerts.find(a => String(a.id) === String(id) || a.uuid === id);
        if (!alert) {
            const err = new Error('Not Found');
            err.response = { status: 404 };
            throw err;
        }
        return alert;
    } catch (error) {
        throw error;
    }
};

export const getAllActiveAlerts = async () => {
    const response = await apiClient.get('/alerts/active');
    return response.data?.data || response.data;
};

// Gets all alerts regardless of status (search with empty params)
export const getAllAlerts = async () => {
    const response = await apiClient.get('/alerts/search');
    return response.data?.data || response.data || [];
};

export const createAlert = async (payload) => {
    const response = await apiClient.post('/alerts', payload);
    return response.data?.data || response.data;
};

// Emergency broadcast
export const broadcastEmergency = async (payload) => {
    const response = await apiClient.post('/alerts/emergency-override', payload);
    return response.data?.data || response.data;
};

export const updateAlertStatus = async (id, status) => {
    const response = await apiClient.patch(`/alerts/${id}/status`, { status });
    return response.data?.data || response.data;
};

// Mock delete since the backend doesn't support deleting an alert for audit/history reasons
export const deleteAlert = async (id) => {
    return new Promise((resolve) => setTimeout(() => resolve({ success: true, id }), 500));
};

