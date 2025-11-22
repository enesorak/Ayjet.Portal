// Konum: src/api/interceptors.ts

import apiClient from './apiClient';
import { useAuthStore } from '@/stores/authStore';
import {useToast} from "vue-toastification";

export function setupInterceptors() {

    // === 1. İSTEK (REQUEST) YAKALAYICI ===
    // Bir istek gönderilmeden hemen ÖNCE çalışır.
    apiClient.interceptors.request.use(
        (config) => {
            // Eğer gönderilen veri bir FormData ise (yani dosya yüklemesi ise),
            // bizim varsayılan 'Content-Type': 'application/json' başlığını sil.
            // Bu, tarayıcının doğru olan 'multipart/form-data' başlığını
            // kendi 'boundary' bilgisiyle eklemesine izin verir.
            if (config.data instanceof FormData) {
                delete config.headers['Content-Type'];
            }

            // Not: Token ekleme mantığını buradan apiClient.ts'e taşıdık,
            // çünkü her isteğin token'ı beklemeden anında gönderilmesi gerekir.
            // Ancak burada da kalabilir, mevcut yapımızda sorun yaratmaz.

            return config;
        },
        (error) => {
            return Promise.reject(error);
        }
    );


    apiClient.interceptors.response.use(
        // Başarılı yanıtlar için hiçbir şey yapma
        (response) => response,

        // Hatalı yanıtlar için bu fonksiyon çalışacak
        (error) => {
            const toast = useToast();

            // 1. Sunucuya hiç ulaşılamayan ağ hatalarını yakala
            if (!error.response) {
                toast.error("Sunucuya ulaşılamıyor. Lütfen ağ bağlantınızı kontrol edin veya sistem yöneticisiyle iletişime geçin.", { timeout: 7000 });
                // Bu, component'lerdeki .catch bloklarının daha fazla işlem yapmasını engeller
                return Promise.reject(new Error("Network Error: Server is unreachable."));
            }

            // 2. Sunucudan gelen diğer HTTP hatalarını işle
            const { status, data } = error.response;

            switch (status) {
                case 401: // Unauthorized
                    toast.error("Oturum süreniz doldu. Lütfen tekrar giriş yapın.");
                    const authStore = useAuthStore();
                    authStore.logout();
                    // Kullanıcıyı login sayfasına yönlendir.
                    setTimeout(() => window.location.href = '/login', 2000);
                    break;
                case 404: // Not Found
                    toast.error("İstenen kaynak bulunamadı.");
                    break;
                case 500: // Internal Server Error
                    toast.error("Sunucuda beklenmedik bir hata oluştu.");
                    break;
                default:
                    // === DÜZELTME BURADA ===
                    // Sunucudan gelen detaylı hata mesajını bulmaya çalış (büyük/küçük harf duyarsız)
                    const errorMessage = data?.Message || data?.message || data?.title || "İşlem sırasında bir hata oluştu..";
                  console.log(errorMessage)
                    toast.error(errorMessage);
                    break;
            }

            return Promise.reject(error);
        }
    );
}