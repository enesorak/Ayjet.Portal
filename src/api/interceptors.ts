// src/api/interceptors.ts
// API Interceptor - Merkezi hata yakalama

import apiClient from './apiClient';
import { useAuthStore } from '@/stores/authStore';
import { notify } from '@/services/notificationService';

export function setupInterceptors() {

    // === 1. İSTEK (REQUEST) YAKALAYICI ===
    apiClient.interceptors.request.use(
        (config) => {
            // FormData için Content-Type header'ını kaldır
            // Tarayıcı multipart/form-data boundary'yi otomatik eklesin
            if (config.data instanceof FormData) {
                delete config.headers['Content-Type'];
            }
            return config;
        },
        (error) => {
            return Promise.reject(error);
        }
    );

    // === 2. YANIT (RESPONSE) YAKALAYICI ===
    apiClient.interceptors.response.use(
        // Başarılı yanıtlar - dokunma
        (response) => response,

        // Hatalı yanıtlar
        (error) => {
            // 1. Ağ hatası - sunucuya ulaşılamadı
            if (!error.response) {
                notify.networkError();
                return Promise.reject(new Error('Network Error: Server is unreachable.'));
            }

            const { status, data } = error.response;

            // 2. HTTP durum koduna göre işlem
            switch (status) {
                case 401:
                    notify.httpError(401);
                    const authStore = useAuthStore();
                    authStore.logout();
                    setTimeout(() => window.location.href = '/login', 2000);
                    break;

                case 403:
                    notify.httpError(403);
                    break;

                case 404:
                    notify.httpError(404);
                    break;

                case 409:
                    // Conflict - özel mesaj varsa onu göster
                    const conflictMessage = data?.message || data?.Message || data?.title;
                    notify.httpError(409, conflictMessage);
                    break;

                case 500:
                    notify.httpError(500);
                    break;

                default:
                    // Diğer hatalar - API'dan gelen mesajı göster
                    const errorMessage = data?.message || data?.Message || data?.title || 'İşlem sırasında bir hata oluştu.';
                    notify.error(errorMessage);
                    break;
            }

            return Promise.reject(error);
        }
    );
}