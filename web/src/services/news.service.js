import apiClient from '../lib/axios';

// ── Categories ────────────────────────────────────────────────────────────────

/** GET /news-categories → List<NewsCategoryResponse> */
export const getNewsCategories = async () => {
    const r = await apiClient.get('/news-categories');
    return r.data;
};

/** POST /news-categories → NewsCategoryResponse (201) */
export const createNewsCategory = async (payload) => {
    const r = await apiClient.post('/news-categories', payload);
    return r.data;
};

/** PUT /news-categories/{id} → NewsCategoryResponse */
export const updateNewsCategory = async (id, payload) => {
    const r = await apiClient.put(`/news-categories/${id}`, payload);
    return r.data;
};

/** DELETE /news-categories/{id} → 204 */
export const deleteNewsCategory = async (id) => {
    await apiClient.delete(`/news-categories/${id}`);
};

// ── Articles ──────────────────────────────────────────────────────────────────

/** GET /news-articles?status=&page=&size= → Page<NewsArticleResponse> */
export const getNewsArticles = async (page = 0, size = 15, status = '') => {
    const params = { page, size };
    if (status) params.status = status;
    const r = await apiClient.get('/news-articles', { params });
    return r.data;
};

/** GET /news-articles/featured → Page<NewsArticleResponse> */
export const getFeaturedArticles = async (page = 0, size = 10) => {
    const r = await apiClient.get('/news-articles/featured', { params: { page, size } });
    return r.data;
};

/** GET /news-articles/search?q= → Page<NewsArticleResponse> */
export const searchNewsArticles = async (q, page = 0, size = 15) => {
    const r = await apiClient.get('/news-articles/search', { params: { q, page, size } });
    return r.data;
};

/** GET /news-categories/{id}/articles → Page<NewsArticleResponse> */
export const getArticlesByCategory = async (categoryId, page = 0, size = 15) => {
    const r = await apiClient.get(`/news-categories/${categoryId}/articles`, { params: { page, size } });
    return r.data;
};

/** GET /news-articles/{id} → NewsArticleResponse */
export const getNewsArticleById = async (id) => {
    const r = await apiClient.get(`/news-articles/${id}`);
    return r.data;
};

/** POST /news-articles → NewsArticleResponse (201) */
export const createNewsArticle = async (payload) => {
    const r = await apiClient.post('/news-articles', payload);
    return r.data;
};

/** PUT /news-articles/{id} → NewsArticleResponse */
export const updateNewsArticle = async (id, payload) => {
    const r = await apiClient.put(`/news-articles/${id}`, payload);
    return r.data;
};

/** PATCH /news-articles/{id}/publish → NewsArticleResponse */
export const publishNewsArticle = async (id) => {
    const r = await apiClient.patch(`/news-articles/${id}/publish`);
    return r.data;
};

/** PATCH /news-articles/{id}/archive → NewsArticleResponse */
export const archiveNewsArticle = async (id) => {
    const r = await apiClient.patch(`/news-articles/${id}/archive`);
    return r.data;
};

/** DELETE /news-articles/{id} → 204 (soft-delete) */
export const deleteNewsArticle = async (id) => {
    await apiClient.delete(`/news-articles/${id}`);
};
