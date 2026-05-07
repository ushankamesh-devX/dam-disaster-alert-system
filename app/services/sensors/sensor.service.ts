import { axiosInstance, ENDPOINTS } from "../api";

export const sensorService = {
  getAll: (params?: { page?: number; size?: number }) =>
    axiosInstance.get(ENDPOINTS.SENSORS.BASE, { params }),

  getById: (id: string) => axiosInstance.get(ENDPOINTS.SENSORS.BY_ID(id)),

  getByUid: (uid: string) => axiosInstance.get(ENDPOINTS.SENSORS.BY_UID(uid)),

  getByDam: (damId: string) =>
    axiosInstance.get(ENDPOINTS.SENSORS.BY_DAM(damId)),

  getActiveByDam: (damId: string) =>
    axiosInstance.get(ENDPOINTS.SENSORS.ACTIVE_BY_DAM(damId)),

  getProblematicByDam: (damId: string) =>
    axiosInstance.get(ENDPOINTS.SENSORS.PROBLEMATIC_BY_DAM(damId)),

  getByStatus: (status: string) =>
    axiosInstance.get(ENDPOINTS.SENSORS.BY_STATUS(status)),

  getTypes: () => axiosInstance.get(ENDPOINTS.SENSORS.TYPES),

  getReadings: (id: string, params?: { page?: number; size?: number }) =>
    axiosInstance.get(ENDPOINTS.SENSORS.READINGS(id), { params }),

  getLatestReading: (id: string) =>
    axiosInstance.get(ENDPOINTS.SENSORS.LATEST_READING(id)),

  getLatestReadingsByDam: (damId: string) =>
    axiosInstance.get(ENDPOINTS.SENSORS.LATEST_BY_DAM(damId)),

  getReadingsInRange: (
    id: string,
    params: { startDate: string; endDate: string }
  ) => axiosInstance.get(ENDPOINTS.SENSORS.READINGS_RANGE(id), { params }),

  getStatistics: (id: string, params?: Record<string, unknown>) =>
    axiosInstance.get(ENDPOINTS.SENSORS.STATISTICS(id), { params }),

  getStatisticsByDam: (damId: string) =>
    axiosInstance.get(ENDPOINTS.SENSORS.STATISTICS_BY_DAM(damId)),

  create: (data: Record<string, unknown>) =>
    axiosInstance.post(ENDPOINTS.SENSORS.BASE, data),

  createReading: (data: Record<string, unknown>) =>
    axiosInstance.post(ENDPOINTS.SENSORS.READINGS_BASE, data),

  createBatchReadings: (readings: Record<string, unknown>[]) =>
    axiosInstance.post(ENDPOINTS.SENSORS.READINGS_BATCH, { readings }),

  update: (id: string, data: Record<string, unknown>) =>
    axiosInstance.put(ENDPOINTS.SENSORS.BY_ID(id), data),

  delete: (id: string) => axiosInstance.delete(ENDPOINTS.SENSORS.BY_ID(id)),
};
