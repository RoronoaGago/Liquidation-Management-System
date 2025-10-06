// src/api/schoolApi.ts

import api from "../api/axios";


export const searchSchools = async (query: string) => {
    try {
        const response = await api.get("schools/search/", {
            params: { search: query },
        });
        return response.data;
    } catch (error) {
        console.error("Error searching schools:", error);
        return [];
    }
};