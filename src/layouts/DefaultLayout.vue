<script setup lang="ts">
import { RouterView, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'vue-router';
import Breadcrumbs from "@/components/common/Breadcrumbs.vue";

const authStore = useAuthStore();
const router = useRouter();

const handleLogout = () => {
  authStore.logout();
  router.push('/login');
};
</script>

<template>
  <div class="min-h-screen bg-gray-100">
    <header class="bg-white shadow-sm">
      <nav class="container mx-auto px-6 py-3 flex justify-between items-center">
        <div class="flex items-center space-x-4">
          <img src="/ayjet_logo.png" alt="Ayjet Logo" class="w-48 h-auto" />
        </div>
        <div class="flex items-center space-x-6">
          <RouterLink to="/" class="text-gray-600 hover:text-indigo-600">Ana Sayfa</RouterLink>
          <RouterLink to="/test-definitions" class="text-gray-600 hover:text-indigo-600">Test Yönetimi</RouterLink>
          <RouterLink to="/candidates" class="p-2 text-gray-600 hover:text-indigo-600">Adaylar</RouterLink>
          <RouterLink to="/test-assignments" class="p-2 text-gray-600 hover:text-indigo-600">Test Atamaları</RouterLink>
          <RouterLink to="/users" class="p-2 text-gray-600 hover:text-indigo-600">Kullanıcılar</RouterLink>

          <a v-if="authStore.isAuthenticated" @click="handleLogout" href="#" class="p-2 text-gray-600 hover:text-indigo-600">Çıkış Yap</a>
        </div>
      </nav>
    </header>
    <div class="min-h-screen bg-gray-50">
      <header class="bg-white shadow-sm">
      </header>
      <main>
        <div class="container mx-auto p-6">
          <Breadcrumbs /> <RouterView /> </div>
      </main>
    </div>

  </div>
</template>