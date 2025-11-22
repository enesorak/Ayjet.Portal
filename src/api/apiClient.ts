import axios from 'axios';
import {useAuthStore} from "@/stores/authStore.ts";
import { API_BASE_URL, API_TIMEOUT } from '@/config';


const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: API_TIMEOUT,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // Cookie ve CORS için
});


const token = localStorage.getItem('authToken');
if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

export default apiClient;