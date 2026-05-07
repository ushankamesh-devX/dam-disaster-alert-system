import { axiosInstance, ENDPOINTS } from "../api";

export const damGatesService = {
  getByDam: (damId: string) =>
    axiosInstance.get(ENDPOINTS.DAM_GATES.BY_DAM(damId)),

  getOpenByDam: (damId: string) =>
    axiosInstance.get(ENDPOINTS.DAM_GATES.OPEN_BY_DAM(damId)),

  getById: (id: string) => axiosInstance.get(ENDPOINTS.DAM_GATES.BY_ID(id)),

  create: (data: Record<string, unknown>) =>
    axiosInstance.post(ENDPOINTS.DAM_GATES.BASE, data),

  update: (id: string, data: Record<string, unknown>) =>
    axiosInstance.put(ENDPOINTS.DAM_GATES.BY_ID(id), data),
};
