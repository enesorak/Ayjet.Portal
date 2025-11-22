
import { API_BASE_URL } from '@/config';

export function resolveApiUrl(relativePath?: string | null): string | null {
    if (!relativePath) {
        return null;
    }
    // Zaten tam bir URL ise, dokunma
    if (relativePath.startsWith('http')) {
        return relativePath;
    }
    // Başında '/' varsa birleştir, yoksa ekle
    return `${API_BASE_URL}${relativePath.startsWith('/') ? relativePath : '/' + relativePath}`;
}