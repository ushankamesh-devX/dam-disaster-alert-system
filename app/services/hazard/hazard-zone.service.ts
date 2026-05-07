import { axiosInstance, ENDPOINTS } from "../api";

export const hazardZoneService = {
  getByDam: (damId: string) =>
    axiosInstance.get(ENDPOINTS.HAZARD_ZONES.BY_DAM(damId)),

  getActiveByDam: (damId: string) =>
    axiosInstance.get(ENDPOINTS.HAZARD_ZONES.ACTIVE_BY_DAM(damId)),

  getById: (id: string) =>
    axiosInstance.get(ENDPOINTS.HAZARD_ZONES.BY_ID(id)),

  create: (data: Record<string, unknown>) =>
    axiosInstance.post(ENDPOINTS.HAZARD_ZONES.BASE, data),

  update: (id: string, data: Record<string, unknown>) =>
    axiosInstance.put(ENDPOINTS.HAZARD_ZONES.BY_ID(id), data),

  delete: (id: string) =>
    axiosInstance.delete(ENDPOINTS.HAZARD_ZONES.BY_ID(id)),
};
