import apiClient from '../lib/axios';

// ── Device API Keys (Admin) ──────────────────────────────────────────────────

/** GET /device-keys → List<DeviceApiKeyResponse> */
export const getAllDeviceApiKeys = async () => {
    const r = await apiClient.get('/device-keys');
    return r.data;
};

/** GET /device-keys/{id} → DeviceApiKeyResponse */
export const getDeviceApiKeyById = async (id) => {
    const r = await apiClient.get(`/device-keys/${id}`);
    return r.data;
};

/** GET /device-keys/sensor/{sensorId} → List<DeviceApiKeyResponse> */
export const getDeviceApiKeysBySensor = async (sensorId) => {
    const r = await apiClient.get(`/device-keys/sensor/${sensorId}`);
    return r.data;
};

/** POST /device-keys → ApiResponse<DeviceApiKeyCreatedResponse>
 *  payload: { sensorId, name, description, expiresAt }
 *  Returns the raw API key (shown only once!) */
export const createDeviceApiKey = async (payload) => {
    const r = await apiClient.post('/device-keys', payload);
    return r.data;
};

/** PUT /device-keys/{id}/deactivate → ApiResponse<void> */
export const deactivateDeviceApiKey = async (id) => {
    const r = await apiClient.put(`/device-keys/${id}/deactivate`);
    return r.data;
};

/** PUT /device-keys/{id}/activate → ApiResponse<void> */
export const activateDeviceApiKey = async (id) => {
    const r = await apiClient.put(`/device-keys/${id}/activate`);
    return r.data;
};

/** POST /device-keys/{id}/regenerate → ApiResponse<DeviceApiKeyCreatedResponse> */
export const regenerateDeviceApiKey = async (id) => {
    const r = await apiClient.post(`/device-keys/${id}/regenerate`);
    return r.data;
};

/** DELETE /device-keys/{id} → 204 */
export const deleteDeviceApiKey = async (id) => {
    await apiClient.delete(`/device-keys/${id}`);
};
