import { axiosInstance, ENDPOINTS } from "../api";

export const hazardLevelService = {
  getAll: () => axiosInstance.get(ENDPOINTS.HAZARD_LEVELS.BASE),

  getById: (id: string) =>
    axiosInstance.get(ENDPOINTS.HAZARD_LEVELS.BY_ID(id)),

  getActive: () => axiosInstance.get(ENDPOINTS.HAZARD_LEVELS.ACTIVE),
};
