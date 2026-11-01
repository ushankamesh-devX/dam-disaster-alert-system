import { create, AxiosError, InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL, API_TIMEOUT, API_USE_EXPO_PROXY } from "@env";
import Constants from "expo-constants";
import { tokenStorage } from "./token.storage";

const expoHost = Constants.expoConfig?.hostUri;
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null) { onUnauthorized = handler; }
const apiUrl = API_USE_EXPO_PROXY === "true" && expoHost
  ? `http://${expoHost.replace(/^https?:\/\//, "")}/api/v1`
  : API_BASE_URL;

export const axiosInstance = create({
  baseURL: apiUrl,
  timeout: parseInt(API_TIMEOUT, 10),
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await tokenStorage.get();
    if (token && !config.url?.startsWith('/auth/')) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401 && !error.config?.url?.startsWith('/auth/')) {
      const token = await tokenStorage.get();
      // A late response from an old session must not clear a newly signed-in user.
      if (token && error.config?.headers?.Authorization === `Bearer ${token}`) {
        await tokenStorage.clear();
        onUnauthorized?.();
      }
    }
    return Promise.reject(error);
  }
);
