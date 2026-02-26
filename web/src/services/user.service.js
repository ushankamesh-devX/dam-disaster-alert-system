import apiClient from '../lib/axios';

// ── helpers ───────────────────────────────────────────────────────────────────
// All user endpoints wrap the payload in ApiResponse { success, message, data }
const d = r => r.data?.data ?? r.data;

// ── Current User (used by AuthContext + DashboardPage) ───────────────────────

/** GET /users/me → ApiResponse<UserResponse> */
export const getCurrentUser = async () => {
    const r = await apiClient.get('/users/me');
    return d(r);
};

// ── Users CRUD ────────────────────────────────────────────────────────────────

/** GET /users?page=&size=&sortBy=&sortDirection= → ApiResponse<Page<UserResponse>> */
export const getAllUsers = async (page = 0, size = 20, sortBy = 'createdAt', sortDirection = 'desc') => {
    const r = await apiClient.get('/users', { params: { page, size, sortBy, sortDirection } });
    return d(r); // Spring Page
};

/** GET /users/all → ApiResponse<List<UserResponse>> */
export const getAllUsersList = async () => {
    const r = await apiClient.get('/users/all');
    return d(r);
};

/** GET /users/search?q=&page=&size= → ApiResponse<Page<UserResponse>> */
export const searchUsers = async (q, page = 0, size = 20) => {
    const r = await apiClient.get('/users/search', { params: { q, page, size } });
    return d(r);
};

/** GET /users/by-status/{status}?page=&size= → ApiResponse<Page<UserResponse>> */
export const getUsersByStatus = async (status, page = 0, size = 20) => {
    const r = await apiClient.get(`/users/by-status/${status}`, { params: { page, size } });
    return d(r);
};

/** GET /users/by-role/{roleId}?page=&size= → ApiResponse<Page<UserResponse>> */
export const getUsersByRole = async (roleId, page = 0, size = 20) => {
    const r = await apiClient.get(`/users/by-role/${roleId}`, { params: { page, size } });
    return d(r);
};

/** GET /users/{id} → ApiResponse<UserResponse> */
export const getUserById = async (id) => {
    const r = await apiClient.get(`/users/${id}`);
    return d(r);
};

/** POST /users → ApiResponse<UserResponse> (201)
 *  payload: { fullName, email, phoneNumber, password, roleId, languagePreference, status } */
export const adminCreateUser = async (payload) => {
    const r = await apiClient.post('/users', payload);
    return d(r);
};

/** PUT /users/{id} → ApiResponse<UserResponse>
 *  payload: UpdateProfileRequest { fullName, phoneNumber, languagePreference } */
export const updateUserProfile = async (id, payload) => {
    const r = await apiClient.put(`/users/${id}`, payload);
    return d(r);
};

/** PUT /users/{id}/status → ApiResponse<UserResponse>
 *  payload: { status, reason? } */
export const updateUserStatus = async (id, payload) => {
    const r = await apiClient.put(`/users/${id}/status`, payload);
    return d(r);
};

/** PUT /users/{id}/role → ApiResponse<UserResponse>
 *  payload: { roleId, reason? } */
export const updateUserRole = async (id, payload) => {
    const r = await apiClient.put(`/users/${id}/role`, payload);
    return d(r);
};

/** DELETE /users/{id} → ApiResponse<Void> (soft delete) */
export const deleteUser = async (id) => {
    const r = await apiClient.delete(`/users/${id}`);
    return d(r);
};

/** POST /users/{id}/restore → ApiResponse<UserResponse> */
export const restoreUser = async (id) => {
    const r = await apiClient.post(`/users/${id}/restore`);
    return d(r);
};

// ── Stats ──────────────────────────────────────────────────────────────────────

/** GET /users/stats → ApiResponse<{ totalActive, totalInactive, totalSuspended, totalPending }> */
export const getUserStats = async () => {
    const r = await apiClient.get('/users/stats');
    return d(r);
};

// ── Roles (for dropdowns) ──────────────────────────────────────────────────────

/** GET /roles → list of RoleResponse */
export const getAllRoles = async () => {
    const r = await apiClient.get('/roles');
    return r.data?.data ?? r.data ?? [];
};
