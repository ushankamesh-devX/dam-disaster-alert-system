import { axiosInstance, ENDPOINTS } from "../api";

export interface UpdateProfilePayload {
  name?: string;
  email?: string;
}

export interface UpdatePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateLocationPayload {
  latitude: number;
  longitude: number;
}

export const userService = {
  getMe: () => axiosInstance.get(ENDPOINTS.USERS.ME),

  getAll: (params?: { page?: number; size?: number }) =>
    axiosInstance.get(ENDPOINTS.USERS.BASE, { params }),

  getById: (id: string) => axiosInstance.get(ENDPOINTS.USERS.BY_ID(id)),

  getStats: () => axiosInstance.get(ENDPOINTS.USERS.STATS),

  getByRole: (roleId: string) =>
    axiosInstance.get(ENDPOINTS.USERS.BY_ROLE(roleId)),

  getByStatus: (status: string) =>
    axiosInstance.get(ENDPOINTS.USERS.BY_STATUS(status)),

  search: (q: string) =>
    axiosInstance.get(ENDPOINTS.USERS.SEARCH, { params: { q } }),

  updateProfile: (data: UpdateProfilePayload) =>
    axiosInstance.put(ENDPOINTS.USERS.ME, data),

  updatePassword: (data: UpdatePasswordPayload) =>
    axiosInstance.put(ENDPOINTS.USERS.ME_PASSWORD, data),

  updateLocation: (data: UpdateLocationPayload) =>
    axiosInstance.put(ENDPOINTS.USERS.ME_LOCATION, data),

  updatePushToken: (pushToken: string) =>
    axiosInstance.put(ENDPOINTS.USERS.ME_PUSH_TOKEN, { pushToken }),

  updateRole: (id: string, roleId: string) =>
    axiosInstance.put(ENDPOINTS.USERS.ROLE(id), { roleId }),

  updateStatus: (id: string, status: string) =>
    axiosInstance.put(ENDPOINTS.USERS.STATUS(id), { status }),

  restore: (id: string) =>
    axiosInstance.post(ENDPOINTS.USERS.RESTORE(id)),
};
