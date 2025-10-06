
import axios from "axios";
import api from "../api/axios";

export const getNotifications = async (page: number = 1, pageSize: number = 20) => {
    console.log('Fetching notifications - page:', page, 'pageSize:', pageSize);
    try {
        const response = await api.get(`notifications/`, {
            params: { page, page_size: pageSize },
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
        return { results: [], count: 0, next: null, previous: null };
    }
};

export const markAsRead = async (notificationId: string) => {
    try {
        await api.patch(`notifications/${notificationId}/read/`);
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
};

export const markAllAsRead = async () => {
    try {
        await api.patch(`notifications/mark-all-read/`);
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
    }
};

export const deleteNotification = async (notificationId: string) => {
    try {
        await api.delete(`notifications/${notificationId}/`);
    } catch (error) {
        console.error('Error deleting notification:', error);
    }
};

export const deleteAllNotifications = async () => {
    try {
        await api.delete(`notifications/delete-all/`);
    } catch (error) {
        console.error('Error deleting all notifications:', error);
    }
};