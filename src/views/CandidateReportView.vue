<script setup lang="ts">
import { ref, onMounted } from 'vue';
import apiClient from '@/api/apiClient';
import { RouterLink } from 'vue-router';

const props = defineProps<{ candidateId: string }>();

const loading = ref(true);
const candidate = ref<any>(null);
const assignments = ref<any[]>([]);

const fetchReportData = async () => {
  loading.value = true;
  try {
    const [candidateRes, assignmentsRes] = await Promise.all([
      apiClient.get(`/candidates/${props.candidateId}`),
      apiClient.get(`/candidates/${props.candidateId}/assignments`)
    ]);
    candidate.value = candidateRes.data;
    assignments.value = assignmentsRes.data;
  } catch (error) {
    console.error("Rapor verileri getirilirken hata oluştu:", error);
  } finally {
    loading.value = false;
  }
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString('tr-TR');
};

onMounted(fetchReportData);
</script>

<template>
  <div class="container mx-auto p-6">
    <div v-if="loading" class="text-center py-10">Yükleniyor...</div>
    <div v-else-if="candidate">
      <h1 class="text-3xl font-bold text-gray-800 mb-2">Aday Raporu: {{ candidate.fullName }}</h1>
      <p class="text-lg text-gray-600 mb-6">{{ candidate.email }}</p>

      <div class="bg-white shadow rounded-lg overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Test Adı</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Atanma Tarihi</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bitiş Tarihi</th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Eylemler</th>
          </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="item in assignments" :key="item.assignmentId">
            <td class="px-6 py-4 font-medium">{{ item.testTitle }}</td>
            <td class="px-6 py-4">{{ item.status }}</td>
            <td class="px-6 py-4">{{ formatDate(item.createdAt) }}</td>
            <td class="px-6 py-4">{{ formatDate(item.completedAt) }}</td>
            <td class="px-6 py-4 text-right">
              <RouterLink :to="{ name: 'test-results', params: { assignmentId: item.assignmentId } }" v-if="item.status === 'Completed'" class="text-indigo-600 hover:text-indigo-900 font-medium">
                Sonucu Gör
              </RouterLink>
            </td>
          </tr>
          <tr v-if="assignments.length === 0">
            <td colspan="5" class="text-center py-4 text-gray-500">Bu adaya ait test ataması bulunmuyor.</td>
          </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>