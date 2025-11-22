<template>
  <div class="flex items-center justify-center min-h-screen bg-gray-100">
    <div class="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">

      <div class="text-center">
        <img src="/ayjet_logo.png" alt="Ayjet Logo" class="mx-auto h-10 w-auto" />
        <h5 class="mt-6 text-3xl font-bold tracking-tight text-gray-900">
          Ayjet Evaluation Center
        </h5>
        <p class="mt-2 text-sm text-gray-600">
          Yetkili Girişi
        </p>
      </div>
      <form class="mt-8 space-y-6" @submit.prevent="handleLogin">
        <div class="rounded-md shadow-sm -space-y-px">
          <div>
            <label for="email-address" class="sr-only">E-posta</label>
            <input v-model="email" id="email-address" name="email" type="email" autocomplete="email" required
                   class="relative block w-full appearance-none rounded-none rounded-t-md border border-gray-300 px-3 py-3 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                   placeholder="E-posta adresi">
          </div>
          <div>
            <label for="password" class="sr-only">Şifre</label>
            <input v-model="password" id="password" name="password" type="password" autocomplete="current-password" required
                   class="relative block w-full appearance-none rounded-none rounded-b-md border border-gray-300 px-3 py-3 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                   placeholder="Şifre">
          </div>
        </div>

        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

        <div>
          <button type="submit" :disabled="loading"
                  class="group relative flex w-full justify-center rounded-md border border-transparent bg-indigo-600 py-3 px-4 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-300">
            {{ loading ? 'Giriş Yapılıyor...' : 'Giriş Yap' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
// Script setup kısmı aynı kalıyor
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';

const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');

const authStore = useAuthStore();
const router = useRouter();

const handleLogin = async () => {
  loading.value = true;
  error.value = '';
  const success = await authStore.login({ email: email.value, password: password.value });
  loading.value = false;

  if (success) {
   await router.push('/');
  } else {
    error.value = 'E-posta veya şifre hatalı.';
  }
};
</script>