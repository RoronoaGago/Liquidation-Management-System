import axios from 'axios';

// Define your API response data types
interface TokenResponse {
    access: string;
    refresh?: string;
}

const api = axios.create({
    baseURL: 'http://127.0.0.1:8000/api/',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Helper function to get tokens
const getTokens = () => ({
    accessToken: localStorage.getItem('access_token'),
    refreshToken: localStorage.getItem('refresh_token'),
});

// Set initial token if available
const { accessToken } = getTokens();
if (accessToken) {
    api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
}

// Request interceptor
api.interceptors.request.use(
    (config) => {
        const { accessToken } = getTokens();
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If error is 401 and we haven't already retried
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const { refreshToken } = getTokens();
                if (!refreshToken) throw new Error('No refresh token available');

                const response = await axios.post<TokenResponse>(
                    'http://127.0.0.1:8000/api/token/refresh/',
                    { refresh: refreshToken }
                );

                localStorage.setItem('access_token', response.data.access);
                if (response.data.refresh) {
                    localStorage.setItem('refresh_token', response.data.refresh);
                }

                api.defaults.headers.common['Authorization'] = `Bearer ${response.data.access}`;
                originalRequest.headers.Authorization = `Bearer ${response.data.access}`;

                return api(originalRequest);
            } catch (err) {
                // If refresh fails, clear storage and redirect to login
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                // window.location.href = '/login';
                return Promise.reject(err);
            }
        }

        return Promise.reject(error);
    }
);

export default api;