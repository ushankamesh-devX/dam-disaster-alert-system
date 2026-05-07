import { axiosInstance, ENDPOINTS } from "../api";

export const regionService = {
  getAll: () => axiosInstance.get(ENDPOINTS.REGIONS.BASE),

  getById: (id: string) => axiosInstance.get(ENDPOINTS.REGIONS.BY_ID(id)),

  create: (data: Record<string, unknown>) =>
    axiosInstance.post(ENDPOINTS.REGIONS.BASE, data),
};
