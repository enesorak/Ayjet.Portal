// src/services/notificationService.ts
// Merkezi Notification Servisi - Tüm toast işlemlerini yönetir

import { useToast, TYPE } from 'vue-toastification';

// Toast instance'ı lazy olarak alıyoruz
let toastInstance: ReturnType<typeof useToast> | null = null;

const getToast = () => {
    if (!toastInstance) {
        toastInstance = useToast();
    }
    return toastInstance;
};

// ============================================
// TEMEL NOTIFICATION METODLARI
// ============================================

const success = (message: string, options?: object) => {
    getToast().success(message, { timeout: 3000, ...options });
};

const error = (message: string, options?: object) => {
    getToast().error(message, { timeout: 5000, ...options });
};

const warning = (message: string, options?: object) => {
    getToast().warning(message, { timeout: 4000, ...options });
};

const info = (message: string, options?: object) => {
    getToast().info(message, { timeout: 3000, ...options });
};

// ============================================
// BULK İŞLEM NOTIFICATION'LARI
// ============================================

interface BulkResult {
    successCount: number;
    failedCount: number;
    errors?: string[];
}

/**
 * Bulk işlem sonuçları için tek akıllı notification
 * @param result - API'dan gelen sonuç objesi
 * @param entityName - İşlem yapılan varlık adı (tekil: "aday", "soru", "fotoğraf")
 */
const bulkResult = (result: BulkResult, entityName: string = 'kayıt') => {
    const { successCount, failedCount } = result;

    // Tamamen başarılı
    if (successCount > 0 && failedCount === 0) {
        success(`${successCount} ${entityName} başarıyla işlendi.`);
        return;
    }

    // Tamamen başarısız
    if (successCount === 0 && failedCount > 0) {
        error(`İşlem başarısız: ${failedCount} ${entityName} işlenemedi.`);
        return;
    }

    // Kısmi başarı
    if (successCount > 0 && failedCount > 0) {
        warning(`${successCount} ${entityName} başarılı, ${failedCount} ${entityName} başarısız.`);
        return;
    }

    // Hiçbir şey işlenmedi (boş liste vs.)
    info(`İşlenecek ${entityName} bulunamadı.`);
};

// ============================================
// API RESPONSE HELPER'LARI
// ============================================

interface ApiErrorResponse {
    message?: string;
    Message?: string;
    title?: string;
    errors?: string[];
}

/**
 * API hata response'ından mesaj çıkarır
 */
const extractErrorMessage = (error: any, fallback: string = 'Bir hata oluştu.'): string => {
    if (!error?.response?.data) return fallback;

    const data: ApiErrorResponse = error.response.data;
    return data.message || data.Message || data.title || fallback;
};

/**
 * API hatası için notification gösterir
 * NOT: Interceptor'da zaten handle ediliyorsa kullanmayın
 */
const apiError = (error: any, fallback?: string) => {
    const message = extractErrorMessage(error, fallback);
    getToast().error(message, { timeout: 5000 });
};

// ============================================
// HTTP STATUS BAZLI NOTIFICATION'LAR
// (Interceptor tarafından kullanılır)
// ============================================

const httpError = (status: number, customMessage?: string) => {
    const messages: Record<number, string> = {
        400: 'Geçersiz istek.',
        401: 'Oturum süreniz doldu. Lütfen tekrar giriş yapın.',
        403: 'Bu işlem için yetkiniz bulunmuyor.',
        404: 'İstenen kaynak bulunamadı.',
        409: 'Bu kayıt zaten mevcut.',
        422: 'Girilen veriler geçersiz.',
        500: 'Sunucuda beklenmedik bir hata oluştu.',
        502: 'Sunucu geçici olarak kullanılamıyor.',
        503: 'Servis geçici olarak kullanılamıyor.',
    };

    const message = customMessage || messages[status] || 'İşlem sırasında bir hata oluştu.';
    error(message);
};

const networkError = () => {
    error('Sunucuya ulaşılamıyor. Lütfen ağ bağlantınızı kontrol edin.', { timeout: 7000 });
};

// ============================================
// CRUD İŞLEM NOTIFICATION'LARI
// ============================================

const crud = {
    created: (entityName: string = 'Kayıt') => success(`${entityName} başarıyla oluşturuldu.`),
    updated: (entityName: string = 'Kayıt') => success(`${entityName} başarıyla güncellendi.`),
    deleted: (entityName: string = 'Kayıt') => success(`${entityName} başarıyla silindi.`),
    archived: (entityName: string = 'Kayıt') => success(`${entityName} başarıyla arşivlendi.`),
    unarchived: (entityName: string = 'Kayıt') => success(`${entityName} arşivden çıkarıldı.`),
    fetched: (entityName: string = 'Veriler') => {}, // Genelde sessiz
    fetchError: (entityName: string = 'Veriler') => error(`${entityName} getirilirken hata oluştu.`),
};

// ============================================
// ÖZEL İŞLEM NOTIFICATION'LARI
// ============================================

const custom = {
    copied: (itemName: string = 'Link') => success(`${itemName} kopyalandı!`),
    sent: (itemName: string = 'Mesaj') => success(`${itemName} gönderildi.`),
    uploaded: (itemName: string = 'Dosya') => success(`${itemName} yüklendi.`),
    downloaded: (itemName: string = 'Dosya') => success(`${itemName} indirildi.`),
    assigned: (itemName: string = 'Test') => success(`${itemName} başarıyla atandı.`),
    validation: (message: string) => warning(message),
    confirm: (message: string) => info(message),
};

// ============================================
// EXPORT
// ============================================

export const notify = {
    // Temel
    success,
    error,
    warning,
    info,

    // Bulk işlemler
    bulkResult,

    // API
    apiError,
    extractErrorMessage,
    httpError,
    networkError,

    // CRUD
    crud,

    // Özel
    custom,
};

// Default export
export default notify;