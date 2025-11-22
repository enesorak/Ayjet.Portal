<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useAuthStore } from '@/stores/authStore';
import apiClient from '@/api/apiClient';

const authStore = useAuthStore();
const stats = ref({ totalTestDefinitions: 0, pendingAssignments: 0, completedToday: 0 });
const loading = ref(true);

const user = computed(() => authStore.currentUser);

onMounted(async () => {
  // Component yüklendiğinde istatistikleri çek
  try {
    const response = await apiClient.get('/dashboard/stats');
    stats.value = response.data;
  } catch (error) {
    console.error("Failed to fetch dashboard stats:", error);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="p-8">
    <h1 class="text-3xl font-bold text-gray-800">Ana Sayfa</h1>
    <p v-if="user" class="text-lg text-gray-600 mt-2">Hoş geldiniz, {{ user.fullName }}!</p>

    <div v-if="loading" class="mt-6">Yükleniyor...</div>
    <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">

      <div class="bg-white p-6 rounded-lg shadow">
        <h3 class="text-gray-500 text-sm font-medium">TOPLAM TEST TANIMI</h3>
        <p class="text-3xl font-bold text-gray-900 mt-2">{{ stats.totalTestDefinitions }}</p>
      </div>

      <div class="bg-white p-6 rounded-lg shadow">
        <h3 class="text-gray-500 text-sm font-medium">BEKLEYEN ATAMALAR</h3>
        <p class="text-3xl font-bold text-gray-900 mt-2">{{ stats.pendingAssignments }}</p>
      </div>

      <div class="bg-white p-6 rounded-lg shadow">
        <h3 class="text-gray-500 text-sm font-medium">BUGÜN TAMAMLANANLAR</h3>
        <p class="text-3xl font-bold text-gray-900 mt-2">{{ stats.completedToday }}</p>
      </div>

    </div>
  </div>
</template>