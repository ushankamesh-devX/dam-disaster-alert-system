import { axiosInstance, ENDPOINTS } from "../api";

export const damStatusService = {
  getAll: () => axiosInstance.get(ENDPOINTS.DAM_STATUS.ALL),

  getByDam: (damId: string) =>
    axiosInstance.get(ENDPOINTS.DAM_STATUS.BY_DAM(damId)),

  getHighRisk: () => axiosInstance.get(ENDPOINTS.DAM_STATUS.HIGH_RISK),

  update: (damId: string, data: Record<string, unknown>) =>
    axiosInstance.put(ENDPOINTS.DAM_STATUS.BY_DAM(damId), data),
};
