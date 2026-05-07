import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL, API_TIMEOUT } from "@env";
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
    if (error.response?.status === 401) {
      await tokenStorage.clear();
    }
    return Promise.reject(error);
  }
);
