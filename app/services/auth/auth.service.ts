import { axiosInstance, ENDPOINTS, tokenStorage } from "../api";

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export const authService = {
  register: (data: RegisterPayload) =>
    axiosInstance.post(ENDPOINTS.AUTH.REGISTER, data),

  login: async (data: LoginPayload) => {
    const response = await axiosInstance.post(ENDPOINTS.AUTH.LOGIN, data);
    const token: string =
      response.data?.token ||
      response.data?.accessToken ||
      response.data?.data?.token;
    if (token) {
      await tokenStorage.set(token);
    }
    return response;
  },

  logout: async () => {
    await tokenStorage.clear();
  },

  test: () => axiosInstance.get(ENDPOINTS.AUTH.TEST),
};
