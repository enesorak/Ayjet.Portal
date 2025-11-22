// src/config.ts
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Opsiyonel: Diğer config'ler
export const APP_NAME = 'Ayjet Evaluation Center';
export const APP_VERSION = '1.0.0';

// Environment bilgisi
export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;

// Debug mode
export const DEBUG = isDevelopment;

// Dosya yükleme limitleri
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_PHOTO_SIZE = 5 * 1024 * 1024;  // 5MB

// API timeout
export const API_TIMEOUT = 30000; // 30 saniye

// Console log
if (DEBUG) {
    console.log('🔧 Config loaded:', {
        API_BASE_URL,
        environment: import.meta.env.MODE,
        isDevelopment,
        isProduction
    });
}