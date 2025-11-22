import { defineStore } from 'pinia';
import apiClient from '@/api/apiClient';

// Kullanıcı profilinin nasıl görüneceğini net bir şekilde tanımlıyoruz (daha güvenli)
interface UserProfile {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    profilePictureUrl: string | null;
    roles: string[];
}

export const useAuthStore = defineStore('auth', {
    state: () => ({
        token: localStorage.getItem('authToken') || null,
        user: null as UserProfile | null,
    }),
    getters: {
        isAuthenticated: (state) => !!state.token,
        currentUser: (state) => state.user,

        // YENİ EKLEDİĞİMİZ, ROL KONTROLÜ İÇİN GEREKLİ GETTER
        isDeveloper: (state): boolean => {
            // Kullanıcı bilgisi varsa ve rolleri arasında 'Admin' varsa true döner.
            return state.user?.roles.includes('Admin') ?? false;
        }
    },
    actions: {
        async login(credentials: any) {
            try {
                const response = await apiClient.post('/accounts/login', credentials);
                const token = response.data.token;

                // Token'ı state'e ve localStorage'a kaydet
                this.token = token;
                localStorage.setItem('authToken', token);
                apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;

                // Giriş yaptıktan sonra kullanıcı bilgilerini (roller dahil) çek
                await this.fetchUser();
                return true;
            } catch (error) {
                this.logout();
                return false;
            }
        },
        async fetchUser() {
            if (this.token) {
                try {
                    const response = await apiClient.get('/accounts/me');
                    this.user = response.data;
                } catch (error) {
                    // Token geçersizse (örn. süresi dolmuşsa), otomatik çıkış yaptır.
                    this.logout();
                }
            }
        },
        logout() {
            this.token = null;
            this.user = null;
            localStorage.removeItem('authToken');
            delete apiClient.defaults.headers.common['Authorization'];
            // Kullanıcıyı login sayfasına yönlendir.
            window.location.href = '/login';
        }
    }
});