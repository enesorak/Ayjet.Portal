<script setup lang="ts">
import {computed, watch} from 'vue'
import { useRoute } from 'vue-router'
import DefaultLayout from './layouts/DefaultLayout.vue'
import AuthLayout from './layouts/AuthLayout.vue'
import { signalRService } from '@/services/signalRService';
import {useAuthStore} from "@/stores/authStore.ts";

const route = useRoute();
const authStore = useAuthStore();
watch(() => authStore.isAuthenticated, (isAuth) => {
  if (isAuth) {
    signalRService.startConnection();
  }
}, { immediate: true });

const layout = computed(() => {
  if (route.meta.layout === 'AuthLayout') {
    return AuthLayout
  }
  return DefaultLayout
})
</script>

<template>
  <component :is="layout" />
</template>

<style>
/* App.vue içindeki tüm style etiketlerini silebiliriz, main.css yeterli */
</style>