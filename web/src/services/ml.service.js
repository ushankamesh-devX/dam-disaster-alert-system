import apiClient from '../lib/axios';

/**
 * Helper to unwrap Spring Boot ApiResponse { success, message, data }
 */
const unwrap = (res) => (res?.data?.data !== undefined ? res.data.data : res?.data);

/**
 * ML Forecasting, Overflow Configuration, and MLOps APIs
 */

/** GET /dams/{id}/forecasts -> List of DamForecast */
export const getDamForecasts = async (damId) => {
    const res = await apiClient.get(`/dams/${damId}/forecasts`);
    return unwrap(res);
};

/** GET /dams/{id}/forecast-history -> Paginated or filtered forecast history */
export const getDamForecastHistory = async (damId, params = {}) => {
    const res = await apiClient.get(`/dams/${damId}/forecast-history`, { params });
    return unwrap(res);
};

/** GET /dams/{id}/overflow-config -> Active DamOverflowConfig */
export const getDamOverflowConfig = async (damId) => {
    const res = await apiClient.get(`/dams/${damId}/overflow-config`);
    return unwrap(res);
};

/** PUT /dams/{id}/overflow-config -> Create effective-dated DamOverflowConfig */
export const updateDamOverflowConfig = async (damId, payload) => {
    const res = await apiClient.put(`/dams/${damId}/overflow-config`, payload);
    return unwrap(res);
};

/** GET /admin/ml/monitoring -> ML pipeline monitoring report */
export const getMlMonitoring = async () => {
    const res = await apiClient.get('/admin/ml/monitoring');
    return unwrap(res);
};

/** GET /admin/ml/releases -> Registered model releases */
export const getMlReleases = async () => {
    const res = await apiClient.get('/admin/ml/releases');
    return unwrap(res);
};

/** GET /admin/ml/active-release -> Active loaded model release */
export const getActiveRelease = async () => {
    const res = await apiClient.get('/admin/ml/active-release');
    return unwrap(res);
};

/** PUT /admin/ml/active-release -> Activate or rollback release */
export const updateActiveRelease = async (payload) => {
    const res = await apiClient.put('/admin/ml/active-release', payload);
    return unwrap(res);
};

/** POST /admin/ml/jobs -> Trigger retraining or evaluation job */
export const triggerRetrainingJob = async (jobType = 'train', parameters = {}) => {
    const res = await apiClient.post('/admin/ml/jobs', { job_type: jobType, parameters });
    return unwrap(res);
};

/** GET /admin/ml/jobs/{id} -> Check status of asynchronous ML job */
export const getJobStatus = async (jobId) => {
    const res = await apiClient.get(`/admin/ml/jobs/${jobId}`);
    return unwrap(res);
};

/** POST /admin/ml/forecast-cycle -> Trigger immediate forecast prediction cycle across all dams */
export const runForecastCycle = async () => {
    const res = await apiClient.post('/admin/ml/forecast-cycle');
    return unwrap(res);
};

/** GET /admin/ml/evaluation -> Real vs Predicted verification report */
export const getMlEvaluation = async (params = {}) => {
    const res = await apiClient.get('/admin/ml/evaluation', { params });
    return unwrap(res);
};

