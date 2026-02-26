import apiClient from '../lib/axios';

// NOTE: Region endpoints return data DIRECTLY (no ApiResponse wrapper)

/** GET /regions?page=&size= → Page<RegionResponse> */
export const getAllRegions = async (page = 0, size = 20) => {
    const r = await apiClient.get('/regions', { params: { page, size } });
    return r.data; // Spring Page
};

/** GET /regions/list → List<RegionResponse> */
export const getAllRegionsList = async () => {
    const r = await apiClient.get('/regions/list');
    return r.data;
};

/** GET /regions/{id} → RegionResponse */
export const getRegionById = async (id) => {
    const r = await apiClient.get(`/regions/${id}`);
    return r.data;
};

/** GET /regions/country/{country} → List<RegionResponse> */
export const getRegionsByCountry = async (country) => {
    const r = await apiClient.get(`/regions/country/${encodeURIComponent(country)}`);
    return r.data;
};

/** GET /regions/state/{stateProvince} → List<RegionResponse> */
export const getRegionsByState = async (stateProvince) => {
    const r = await apiClient.get(`/regions/state/${encodeURIComponent(stateProvince)}`);
    return r.data;
};

/** POST /regions → RegionResponse (201)
 *  payload: { name, nameSi?, nameTa?, stateProvince?, country?, latitude?, longitude?, boundaryGeojson? } */
export const createRegion = async (payload) => {
    const r = await apiClient.post('/regions', payload);
    return r.data;
};

/** PUT /regions/{id} → RegionResponse */
export const updateRegion = async (id, payload) => {
    const r = await apiClient.put(`/regions/${id}`, payload);
    return r.data;
};

/** DELETE /regions/{id} → 204 */
export const deleteRegion = async (id) => {
    await apiClient.delete(`/regions/${id}`);
};
