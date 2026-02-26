import apiClient from '../lib/axios';

// ── Sensor Types ──────────────────────────────────────────────────────────────

/** GET /sensors/types → List<SensorTypeResponse> */
export const getSensorTypes = async () => {
    const r = await apiClient.get('/sensors/types');
    return r.data; // plain array
};

// ── Sensors CRUD ──────────────────────────────────────────────────────────────

/** GET /sensors → Page<SensorResponse> */
export const getAllSensors = async (page = 0, size = 20) => {
    const r = await apiClient.get('/sensors', { params: { page, size } });
    return r.data; // Spring Page: { content, totalElements, totalPages, number }
};

/** GET /sensors/dam/{damId} → List<SensorResponse> */
export const getSensorsByDam = async (damId) => {
    const r = await apiClient.get(`/sensors/dam/${damId}`);
    return r.data;
};

/** GET /sensors/dam/{damId}/active → List<SensorResponse> */
export const getActiveSensorsByDam = async (damId) => {
    const r = await apiClient.get(`/sensors/dam/${damId}/active`);
    return r.data;
};

/** GET /sensors/{id} → SensorResponse */
export const getSensorById = async (id) => {
    const r = await apiClient.get(`/sensors/${id}`);
    return r.data;
};

/** GET /sensors/status/{status} → List<SensorResponse>
 *  status: active | inactive | faulty | maintenance | calibrating */
export const getSensorsByStatus = async (status) => {
    const r = await apiClient.get(`/sensors/status/${status}`);
    return r.data;
};

/** GET /sensors/type/{sensorTypeId} → List<SensorResponse> */
export const getSensorsByType = async (sensorTypeId) => {
    const r = await apiClient.get(`/sensors/type/${sensorTypeId}`);
    return r.data;
};

/** GET /sensors/dam/{damId}/problematic → List<SensorResponse> */
export const getProblematicSensorsByDam = async (damId) => {
    const r = await apiClient.get(`/sensors/dam/${damId}/problematic`);
    return r.data;
};

/** POST /sensors → SensorResponse (201)
 *  payload: { sensorUid, damId, sensorTypeId, name, description, locationOnDam,
 *             latitude, longitude, elevationMeters, manufacturer, model, serialNumber,
 *             installationDate, calibrationDate, nextCalibrationDate,
 *             minReading, maxReading, warningThreshold, criticalThreshold,
 *             readingIntervalSeconds, status } */
export const createSensor = async (payload) => {
    const r = await apiClient.post('/sensors', payload);
    return r.data;
};

/** PUT /sensors/{id} → SensorResponse */
export const updateSensor = async (id, payload) => {
    const r = await apiClient.put(`/sensors/${id}`, payload);
    return r.data;
};

/** DELETE /sensors/{id} → 204 */
export const deleteSensor = async (id) => {
    await apiClient.delete(`/sensors/${id}`);
};

// ── Readings ──────────────────────────────────────────────────────────────────

/** GET /sensors/{sensorId}/readings → Page<SensorReadingResponse> */
export const getSensorReadings = async (sensorId, page = 0, size = 50) => {
    const r = await apiClient.get(`/sensors/${sensorId}/readings`, { params: { page, size } });
    return r.data;
};

/** GET /sensors/{sensorId}/readings/latest → SensorReadingResponse */
export const getLatestReading = async (sensorId) => {
    const r = await apiClient.get(`/sensors/${sensorId}/readings/latest`);
    return r.data;
};

/** GET /sensors/dam/{damId}/readings/latest → List<SensorReadingResponse> */
export const getLatestReadingsForDam = async (damId) => {
    const r = await apiClient.get(`/sensors/dam/${damId}/readings/latest`);
    return r.data;
};

/** POST /sensors/readings → SensorReadingResponse (201)
 *  payload: { sensorId, readingValue, unit, quality, recordedAt } */
export const createReading = async (payload) => {
    const r = await apiClient.post('/sensors/readings', payload);
    return r.data;
};

// ── Statistics ────────────────────────────────────────────────────────────────

/** GET /sensors/dam/{damId}/statistics → { damId, totalSensors, activeSensors } */
export const getDamSensorStatistics = async (damId) => {
    const r = await apiClient.get(`/sensors/dam/${damId}/statistics`);
    return r.data;
};
