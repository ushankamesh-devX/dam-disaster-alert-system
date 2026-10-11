import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL, API_TIMEOUT, API_USE_EXPO_PROXY, VIEWER_EMAIL, VIEWER_PASSWORD } from "@env";
import Constants from "expo-constants";
import { tokenStorage } from "./token.storage";

const expoHost = Constants.expoConfig?.hostUri;
const apiUrl = API_USE_EXPO_PROXY === "true" && expoHost
  ? `http://${expoHost.replace(/^https?:\/\//, "")}/api/v1`
  : API_BASE_URL;

export const axiosInstance = axios.create({
  baseURL: apiUrl,
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
        // Re-login with viewer credentials and retry the original request
        const loginRes = await axios.post(`${apiUrl}/auth/login`, {
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
