import { axiosInstance, ENDPOINTS } from "../api";

export const alertService = {
  getAll: (params?: { page?: number; size?: number }) =>
    axiosInstance.get(ENDPOINTS.ALERTS.BASE, { params }),

  getActive: () => axiosInstance.get(ENDPOINTS.ALERTS.ACTIVE),

  getFeed: () => axiosInstance.get(ENDPOINTS.ALERTS.FEED),

  getByDam: (damId: string) =>
    axiosInstance.get(ENDPOINTS.ALERTS.BY_DAM(damId)),

  search: (q: string) =>
    axiosInstance.get(ENDPOINTS.ALERTS.SEARCH, { params: { q } }),

  create: (data: Record<string, unknown>) =>
    axiosInstance.post(ENDPOINTS.ALERTS.BASE, data),

  updateStatus: (id: string, status: string) =>
    axiosInstance.patch(ENDPOINTS.ALERTS.STATUS(id), { status }),
};
