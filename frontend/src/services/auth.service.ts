// src/services/auth.service.ts
import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000/api/auth/';

interface LoginData {
    username: string;
    password: string;
}

interface AuthResponse {
    user: {
        id: number;
        username: string;
        email: string;
        first_name: string;
        last_name: string;
    };
    tokens: {
        access: string;
        refresh: string;
    };
}

export const login = async (data: LoginData): Promise<AuthResponse> => {
    const response = await axios.post<AuthResponse>(`${API_URL}login/`, data);
    if (response.data.tokens.access) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
        localStorage.setItem('accessToken', response.data.tokens.access);
        localStorage.setItem('refreshToken', response.data.tokens.refresh);
    }
    return response.data;
};

export const logout = async (): Promise<void> => {
    const refreshToken = localStorage.getItem('refreshToken');
    await axios.post(`${API_URL}logout/`, { refresh: refreshToken });
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
};

export const getCurrentUser = (): any => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
};

export const getAccessToken = (): string | null => {
    return localStorage.getItem('accessToken');
};

export const refreshAccessToken = async (): Promise<string | null> => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return null;

    try {
        const response = await axios.post(`${API_URL}refresh/`, { refresh: refreshToken });
        if (response.data.access) {
            localStorage.setItem('accessToken', response.data.access);
            return response.data.access;
        }
    } catch (error) {
        logout();
    }
    return null;
};