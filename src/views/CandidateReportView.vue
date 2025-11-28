<script setup lang="ts">
import { ref, onMounted } from 'vue';
import apiClient from '@/api/apiClient';
import { RouterLink } from 'vue-router';
import { useToast } from 'vue-toastification';
import CandidateFormModal from "@/components/Candidate/CandidateFormModal.vue";

const props = defineProps<{ candidateId: string }>();

const toast = useToast();
const loading = ref(true);
const candidate = ref<any>(null);
const assignments = ref<any[]>([]);

// ← YENİ: Modal state
const showEditModal = ref(false);

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
    toast.error("Rapor verileri yüklenirken bir hata oluştu.");
  } finally {
    loading.value = false;
  }
};

// ← YENİ: Profil güncelleme handler
const handleProfileUpdated = () => {
  showEditModal.value = false;
  toast.success("Profil başarıyla güncellendi.");
  fetchReportData();
};

// ← YENİ: Silme handler
const handleDeleteCandidate = async (candidateId: string) => {
  try {
    await apiClient.delete(`/candidates/${candidateId}`);
    toast.success("Aday başarıyla silindi.");
    window.location.href = '/candidates';
  } catch (error: any) {
    const msg = error.response?.data?.title || "Silme işlemi sırasında bir hata oluştu.";
    toast.error(msg);
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
      <!-- Başlık ve Düzenle Butonu -->
      <div class="flex justify-between items-start mb-6">
        <div>
          <h1 class="text-3xl font-bold text-gray-800 mb-2">Aday Raporu: {{ candidate.fullName }}</h1>
          <p class="text-lg text-gray-600">{{ candidate.email }}</p>
        </div>

        <!-- ← YENİ: Profili Düzenle Butonu -->
        <button
            @click="showEditModal = true"
            class="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 flex items-center"
        >
          <i class="mdi mdi-pencil mr-2"></i>
          Profili Düzenle
        </button>
      </div>

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
          <tr v-if="assignments.length === 0">
            <td colspan="5" class="text-center py-6 text-gray-500">
              Bu adaya atanmış herhangi bir sınav bulunamadı.
            </td>
          </tr>
          <tr v-else v-for="assignment in assignments" :key="assignment.assignmentId">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
              {{ assignment.testTitle }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span
                  :class="{
                    'bg-yellow-100 text-yellow-800': assignment.status === 'Pending',
                    'bg-blue-100 text-blue-800': assignment.status === 'InProgress',
                    'bg-green-100 text-green-800': assignment.status === 'Completed',
                    'bg-red-100 text-red-800': assignment.status === 'Expired',
                    'bg-gray-100 text-gray-800': assignment.status === 'Invalidated'
                  }"
                  class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full"
              >
                {{ assignment.status }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ formatDate(assignment.createdAt) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ formatDate(assignment.expiresAt) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
              <RouterLink
                  v-if="assignment.status === 'Completed'"
                  :to="{ name: 'test-results', params: { assignmentId: assignment.assignmentId } }"
                  class="text-blue-600 hover:text-blue-900"
              >
                Raporu Görüntüle
              </RouterLink>
              <span v-else class="text-gray-400">-</span>
            </td>
          </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ← YENİ: Profil Düzenleme Modal -->
    <CandidateFormModal
        v-if="showEditModal"
        :is-edit-mode="true"
        :candidate-data="candidate"
        @close="showEditModal = false"
        @saved="handleProfileUpdated"
        @delete="handleDeleteCandidate"
    />
  </div>
</template>