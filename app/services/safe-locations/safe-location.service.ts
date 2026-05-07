import { axiosInstance, ENDPOINTS } from "../api";

export const safeLocationService = {
  getList: () => axiosInstance.get(ENDPOINTS.SAFE_LOCATIONS.LIST),

  getByUuid: (uuid: string) =>
    axiosInstance.get(ENDPOINTS.SAFE_LOCATIONS.BY_UUID(uuid)),

  create: (data: Record<string, unknown>) =>
    axiosInstance.post(ENDPOINTS.SAFE_LOCATIONS.BASE, data),

  bulkUpsert: (locations: Record<string, unknown>[]) =>
    axiosInstance.post(ENDPOINTS.SAFE_LOCATIONS.BULK_UPSERT, { locations }),

  update: (id: string, data: Record<string, unknown>) =>
    axiosInstance.put(ENDPOINTS.SAFE_LOCATIONS.BY_ID(id), data),

  deleteByUuid: (uuid: string) =>
    axiosInstance.delete(ENDPOINTS.SAFE_LOCATIONS.BY_UUID(uuid)),
};
