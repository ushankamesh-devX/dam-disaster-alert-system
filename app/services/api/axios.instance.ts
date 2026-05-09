import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL, API_TIMEOUT, TEST_TOKEN, VIEWER_EMAIL, VIEWER_PASSWORD } from "@env";
import { tokenStorage } from "./token.storage";

export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: parseInt(API_TIMEOUT, 10),
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await tokenStorage.get();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      await tokenStorage.clear();
      try {
        if (TEST_TOKEN) {
          await tokenStorage.set(TEST_TOKEN);
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${TEST_TOKEN}`;
          }
          return axiosInstance(originalRequest);
        }
        // Re-login with viewer credentials and retry the original request
        const loginRes = await axios.post(`${API_BASE_URL}${"/auth/login"}`, {
          email: VIEWER_EMAIL,
          password: VIEWER_PASSWORD,
        });
        const newToken: string =
          loginRes.data?.token ?? loginRes.data?.data?.token ?? loginRes.data?.accessToken;
        if (newToken) {
          await tokenStorage.set(newToken);
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          return axiosInstance(originalRequest);
        }
      } catch {
        // Re-login failed — reject original error
      }
    }
    return Promise.reject(error);
  }
);
