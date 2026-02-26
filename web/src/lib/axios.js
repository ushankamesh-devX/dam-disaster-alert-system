import axios from 'axios';

function baseUrlEndsWithApiV1(baseURL) {
    if (!baseURL || typeof baseURL !== 'string') return false;
    return /\/api\/v1\/?$/.test(baseURL);
}

function stripLeadingApiV1(url) {
    if (!url || typeof url !== 'string') return url;
    return url.replace(/^\/api\/v1(\/|$)/, '/');
}

const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 15000,
});

// Request interceptor — attach token
apiClient.interceptors.request.use(
    (config) => {
        // Prevent accidental double-prefix when baseURL already includes '/api/v1'
        // Example: baseURL='http://localhost:8080/api/v1' + url='/api/v1/regions/list'
        // becomes 'http://localhost:8080/api/v1/regions/list'
        try {
            const baseURL = config.baseURL || apiClient.defaults.baseURL;
            if (baseUrlEndsWithApiV1(baseURL) && typeof config.url === 'string' && config.url.startsWith('/api/v1')) {
                config.url = stripLeadingApiV1(config.url);
            }
        } catch {
            // ignore
        }

        // Dynamically read token so it's always fresh
        const stored = localStorage.getItem('auth-storage');
        if (stored) {
            try {
                const { state } = JSON.parse(stored);
                if (state?.token) {
                    config.headers.Authorization = `Bearer ${state.token}`;
                }
            } catch {
                // ignore parse errors
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor — handle 401
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Clear auth storage and redirect to login
            localStorage.removeItem('auth-storage');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default apiClient;
