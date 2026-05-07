import { axiosInstance, ENDPOINTS } from "../api";

export const newsService = {
  getAll: (params?: { page?: number; size?: number }) =>
    axiosInstance.get(ENDPOINTS.NEWS.BASE, { params }),

  getById: (id: string) => axiosInstance.get(ENDPOINTS.NEWS.BY_ID(id)),

  getFeatured: () => axiosInstance.get(ENDPOINTS.NEWS.FEATURED),

  search: (q: string) =>
    axiosInstance.get(ENDPOINTS.NEWS.SEARCH, { params: { q } }),

  saveArticle: (id: string) =>
    axiosInstance.post(ENDPOINTS.NEWS.SAVE(id)),

  shareArticle: (id: string) =>
    axiosInstance.post(ENDPOINTS.NEWS.SHARE(id)),

  markViewed: (id: string) =>
    axiosInstance.post(ENDPOINTS.NEWS.VIEW(id)),

  getPushLogs: (id: string) =>
    axiosInstance.get(ENDPOINTS.NEWS.PUSH_LOGS(id)),

  getSavedByUser: (userId: string) =>
    axiosInstance.get(ENDPOINTS.NEWS.SAVED_BY_USER(userId)),

  getUserSubscriptions: (userId: string) =>
    axiosInstance.get(ENDPOINTS.NEWS.USER_SUBSCRIPTIONS(userId)),

  create: (data: Record<string, unknown>) =>
    axiosInstance.post(ENDPOINTS.NEWS.BASE, data),

  update: (id: string, data: Record<string, unknown>) =>
    axiosInstance.put(ENDPOINTS.NEWS.BY_ID(id), data),

  publish: (id: string) => axiosInstance.patch(ENDPOINTS.NEWS.PUBLISH(id)),

  archive: (id: string) => axiosInstance.patch(ENDPOINTS.NEWS.ARCHIVE(id)),

  delete: (id: string) => axiosInstance.delete(ENDPOINTS.NEWS.BY_ID(id)),

  createSubscription: (data: Record<string, unknown>) =>
    axiosInstance.post(ENDPOINTS.NEWS.SUBSCRIPTIONS, data),

  updateSubscription: (id: string, data: Record<string, unknown>) =>
    axiosInstance.put(ENDPOINTS.NEWS.SUBSCRIPTION_BY_ID(id), data),

  deleteSubscription: (id: string) =>
    axiosInstance.delete(ENDPOINTS.NEWS.SUBSCRIPTION_BY_ID(id)),
};
