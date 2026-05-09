import apiClient from '../lib/axios';

// ── Report Types ──────────────────────────────────────────────────────────────

/** GET /report-types → List<ReportTypeResponse> */
export const getReportTypes = async () => {
    const r = await apiClient.get('/report-types');
    return r.data;
};

/** GET /report-types/{id} → ReportTypeResponse */
export const getReportTypeById = async (id) => {
    const r = await apiClient.get(`/report-types/${id}`);
    return r.data;
};

/** GET /report-types/category/{category} → List<ReportTypeResponse> */
export const getReportTypesByCategory = async (category) => {
    const r = await apiClient.get(`/report-types/category/${category}`);
    return r.data;
};

// ── Reports ───────────────────────────────────────────────────────────────────

/** GET /reports?page=&size=&status=&priority=&reportTypeId=&damId= → Page<ReportListResponse> */
export const getReports = async (params = {}) => {
    const r = await apiClient.get('/reports', { params });
    return r.data;
};

/** GET /reports/{id} → ReportResponse */
export const getReportById = async (id) => {
    const r = await apiClient.get(`/reports/${id}`);
    return r.data;
};

/** GET /reports/stats → ReportStatsResponse */
export const getReportStats = async () => {
    const r = await apiClient.get('/reports/stats');
    return r.data;
};

/** PATCH /reports/{id}/status → ReportResponse */
export const updateReportStatus = async (id, payload) => {
    const r = await apiClient.patch(`/reports/${id}/status`, payload);
    return r.data;
};

/** PATCH /reports/{id}/assign → ReportResponse */
export const assignReport = async (id, payload) => {
    const r = await apiClient.patch(`/reports/${id}/assign`, payload);
    return r.data;
};

/** DELETE /reports/{id} → 204 (soft-delete) */
export const deleteReport = async (id) => {
    await apiClient.delete(`/reports/${id}`);
};
