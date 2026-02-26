import apiClient from '../lib/axios';

const LocationTypesService = {
    async list() {
        const res = await apiClient.get('/api/v1/location-types/list');
        return res.data;
    },
};

export default LocationTypesService;
