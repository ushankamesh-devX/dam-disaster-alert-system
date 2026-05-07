import { axiosInstance, ENDPOINTS } from "../api";

export const newsCategoryService = {
  getAll: () => axiosInstance.get(ENDPOINTS.NEWS.CATEGORIES),

  getById: (id: string) =>
    axiosInstance.get(ENDPOINTS.NEWS.CATEGORY_BY_ID(id)),

  getArticlesByCategory: (
    id: string,
    params?: { page?: number; size?: number }
  ) =>
    axiosInstance.get(ENDPOINTS.NEWS.ARTICLES_BY_CATEGORY(id), { params }),

  create: (data: Record<string, unknown>) =>
    axiosInstance.post(ENDPOINTS.NEWS.CATEGORIES, data),

  update: (id: string, data: Record<string, unknown>) =>
    axiosInstance.put(ENDPOINTS.NEWS.CATEGORY_BY_ID(id), data),

  delete: (id: string) =>
    axiosInstance.delete(ENDPOINTS.NEWS.CATEGORY_BY_ID(id)),
};
