<script setup lang="ts">
import { ref, onMounted } from 'vue';
import apiClient from '@/api/apiClient';
import { useToast } from 'vue-toastification';
import { RouterLink } from 'vue-router';

// --- STATE ---
const assignments = ref<any[]>([]);
const paginationData = ref<any>({});
const loading = ref(true);
const activeTab = ref(0); // Index of the currently active tab
const toast = useToast();

const tabs = [
  { name: 'Tümü', status: null },
  { name: 'Bekleyen', status: 1 },
  { name: 'Devam Eden', status: 2 },
  { name: 'Tamamlanmış', status: 3 },
  { name: 'Süresi Dolmuş', status: 4 },
];

// --- METHODS ---
const fetchAssignments = async (page = 1) => {
  loading.value = true;
  try {
    const status = tabs[activeTab.value].status;
    const params: any = {
      pageNumber: page,
      pageSize: 15
    };
    // Only add status to params if it's not null
    if (status !== null) {
      params.status = status;
    }

    const response = await apiClient.get('/test-assignments', { params });
    assignments.value = response.data.items;
    paginationData.value = response.data;
  } catch (error) {
    toast.error("Test atamaları getirilirken hata oluştu.");
    console.error("Failed to fetch test assignments:", error);
  } finally {
    loading.value = false;
  }
};

const changeTab = (tabIndex: number) => {
  activeTab.value = tabIndex;
  fetchAssignments(1); // Reset to page 1 when tab changes
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString('tr-TR', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
};

// --- LIFECYCLE ---
onMounted(() => {
  fetchAssignments(1);
});
</script>

<template>
  <div class="container mx-auto p-6">
    <div class="flex justify-between items-center mb-4">
      <h1 class="text-2xl font-bold text-gray-800">Test Atamaları</h1>
    </div>

    <div class="border-b border-gray-200">
      <nav class="-mb-px flex space-x-8" aria-label="Tabs">
        <button v-for="(tab, index) in tabs" :key="tab.name" @click="changeTab(index)"
                :class="[activeTab === index ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300']"
                class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">
          {{ tab.name }}
        </button>
      </nav>
    </div>

    <div class="bg-white shadow rounded-lg overflow-x-auto mt-4">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
        <tr>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aday</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Test</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Geçerlilik Tarihi</th>
          <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Eylemler</th>
        </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
        <tr v-if="loading">
          <td colspan="5" class="text-center py-8 text-gray-500">Yükleniyor...</td>
        </tr>
        <template v-else>
          <template v-if="assignments.length > 0">
            <tr v-for="item in assignments" :key="item.assignmentId">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ item.candidateFullName }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ item.testTitle }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ item.status }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatDate(item.expiresAt) }}</td>
              <td class="px-6 py-4 text-right text-sm font-medium space-x-4">
                <RouterLink :to="{ name: 'test-results', params: { assignmentId: item.assignmentId } }" v-if="item.status === 'Completed'" class="text-indigo-600 hover:text-indigo-900">
                  Sonucu Gör
                </RouterLink>
              </td>
            </tr>
          </template>
          <tr v-else>
            <td colspan="5" class="px-6 py-4 text-center text-gray-500">Bu kritere uygun test ataması bulunamadı.</td>
          </tr>
        </template>
        </tbody>
      </table>
    </div>

    <div class="flex items-center justify-between mt-4" v-if="!loading && paginationData.totalCount > 0">
      <p class="text-sm text-gray-700">
        Toplam {{ paginationData.totalCount }} kayıttan {{ paginationData.items.length }} tanesi gösteriliyor. Sayfa {{paginationData.pageNumber}} / {{paginationData.totalPages}}
      </p>
      <div class="space-x-2">
        <button @click="fetchAssignments(paginationData.pageNumber - 1)" :disabled="!paginationData.hasPreviousPage" class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-md disabled:opacity-50 disabled:cursor-not-allowed">Önceki</button>
        <button @click="fetchAssignments(paginationData.pageNumber + 1)" :disabled="!paginationData.hasNextPage" class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-md disabled:opacity-50 disabled:cursor-not-allowed">Sonraki</button>
      </div>
    </div>
  </div>
</template>