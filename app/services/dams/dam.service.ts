import { axiosInstance, ENDPOINTS } from "../api";

export const damService = {
  getAll: (params?: { page?: number; size?: number }) =>
    axiosInstance.get(ENDPOINTS.DAMS.BASE, { params }),

  getList: () => axiosInstance.get(ENDPOINTS.DAMS.LIST),

  getById: (id: string) => axiosInstance.get(ENDPOINTS.DAMS.BY_ID(id)),

  getByCode: (code: string) => axiosInstance.get(ENDPOINTS.DAMS.BY_CODE(code)),

  getActive: () => axiosInstance.get(ENDPOINTS.DAMS.ACTIVE),

  getByRegion: (regionId: string) =>
    axiosInstance.get(ENDPOINTS.DAMS.BY_REGION(regionId)),

  getByStatus: (status: string) =>
    axiosInstance.get(ENDPOINTS.DAMS.BY_STATUS(status)),

  getByHazardStatus: (status: string) =>
    axiosInstance.get(ENDPOINTS.DAMS.BY_HAZARD_STATUS(status)),

  search: (q: string) =>
    axiosInstance.get(ENDPOINTS.DAMS.SEARCH, { params: { q } }),

  filter: (params: Record<string, unknown>) =>
    axiosInstance.get(ENDPOINTS.DAMS.FILTER, { params }),

  create: (data: Record<string, unknown>) =>
    axiosInstance.post(ENDPOINTS.DAMS.BASE, data),

  update: (id: string, data: Record<string, unknown>) =>
    axiosInstance.put(ENDPOINTS.DAMS.BY_ID(id), data),

  delete: (id: string) => axiosInstance.delete(ENDPOINTS.DAMS.BY_ID(id)),
};
