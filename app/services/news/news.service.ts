import { axiosInstance, ENDPOINTS } from "../api";

export interface NewsQueryParams {
  status?: string;
  page?: number;
  size?: number;
}

export function getServerOrigin(): string {
  const baseURL = axiosInstance.defaults.baseURL || 'http://localhost:8080/api/v1';
  try {
    const parsed = new URL(baseURL);
    return parsed.origin;
  } catch {
    return baseURL.replace(/\/api\/v1\/?$/, '');
  }
}

export function resolveImageUrl(imageUrl?: string | null): string {
  if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.trim()) {
    return 'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=800&q=80';
  }
  const trimmed = imageUrl.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  const origin = getServerOrigin();
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${origin}${cleanPath}`;
}

export const newsService = {
  getAll: (params?: NewsQueryParams) =>
    axiosInstance.get(ENDPOINTS.NEWS.BASE, { params }),

  getById: (id: string | number) => axiosInstance.get(ENDPOINTS.NEWS.BY_ID(String(id))),

  getFeatured: (params?: { page?: number; size?: number }) =>
    axiosInstance.get(ENDPOINTS.NEWS.FEATURED, { params }),

  search: (q: string, params?: { page?: number; size?: number }) =>
    axiosInstance.get(ENDPOINTS.NEWS.SEARCH, { params: { q, ...params } }),

  saveArticle: (id: string | number) =>
    axiosInstance.post(ENDPOINTS.NEWS.SAVE(String(id))),

  shareArticle: (id: string | number) =>
    axiosInstance.post(ENDPOINTS.NEWS.SHARE(String(id))),

  markViewed: (id: string | number) =>
    axiosInstance.post(ENDPOINTS.NEWS.VIEW(String(id))),

  getPushLogs: (id: string | number) =>
    axiosInstance.get(ENDPOINTS.NEWS.PUSH_LOGS(String(id))),

  getSavedByUser: (userId: string | number) =>
    axiosInstance.get(ENDPOINTS.NEWS.SAVED_BY_USER(String(userId))),

  getUserSubscriptions: (userId: string | number) =>
    axiosInstance.get(ENDPOINTS.NEWS.USER_SUBSCRIPTIONS(String(userId))),

  create: (data: Record<string, unknown> | FormData) => {
    const isFormData = data instanceof FormData;
    return axiosInstance.post(ENDPOINTS.NEWS.BASE, data, {
      headers: isFormData ? { "Content-Type": "multipart/form-data" } : undefined,
    });
  },

  update: (id: string | number, data: Record<string, unknown> | FormData) => {
    const isFormData = data instanceof FormData;
    return axiosInstance.put(ENDPOINTS.NEWS.BY_ID(String(id)), data, {
      headers: isFormData ? { "Content-Type": "multipart/form-data" } : undefined,
    });
  },

  uploadImage: (file: { uri: string; name?: string; type?: string } | FormData) => {
    const formData = file instanceof FormData ? file : new FormData();
    if (!(file instanceof FormData)) {
      formData.append("file", file as unknown as Blob);
    }
    return axiosInstance.post("/news-articles/upload-image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  publish: (id: string | number) => axiosInstance.patch(ENDPOINTS.NEWS.PUBLISH(String(id))),

  archive: (id: string | number) => axiosInstance.patch(ENDPOINTS.NEWS.ARCHIVE(String(id))),

  delete: (id: string | number) => axiosInstance.delete(ENDPOINTS.NEWS.BY_ID(String(id))),

  createSubscription: (data: Record<string, unknown>) =>
    axiosInstance.post(ENDPOINTS.NEWS.SUBSCRIPTIONS, data),

  updateSubscription: (id: string | number, data: Record<string, unknown>) =>
    axiosInstance.put(ENDPOINTS.NEWS.SUBSCRIPTION_BY_ID(String(id)), data),

  deleteSubscription: (id: string | number) =>
    axiosInstance.delete(ENDPOINTS.NEWS.SUBSCRIPTION_BY_ID(String(id))),
};
