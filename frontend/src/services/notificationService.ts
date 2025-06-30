
import axios from "axios";
import api from "./api";

export const getNotifications = async (userId: string | undefined | number) => {
    console.log('Fetching notifications for user:', userId);
    try {
        const response = await api.get(`notifications/`, {
            params: { userId: String(userId) },
        });
        console.log('Response:', {
            status: response.status,
            data: response.data,
            headers: response.headers
        });
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Axios error details:', {
                message: error.message,
                code: error.code,
                response: error.response,
                request: error.request
            });
        } else {
            console.error('Unexpected error:', error);
        }
        return [];
    }
};

export const markAsRead = async (notificationId: string) => {
    try {
        await api.patch(`notifications/${notificationId}/read`);
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
};