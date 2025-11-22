<script setup lang="ts">
import { ref, onMounted } from 'vue';
import apiClient from '@/api/apiClient';
import { useToast } from 'vue-toastification';
import { resolveApiUrl } from '@/utils/urlHelper';

import { format } from 'date-fns';
import AssignTestModal from "@/components/TestAssignments/AssignTestModal.vue";
import {useAuthStore} from "@/stores/authStore.ts";
import ImportMmpiModal from "@/components/Candidate/ImportMmpiModal.vue";
import {RouterLink} from "vue-router";
const showAssignModal = ref(false); // <-- YENİ STATE
const showImportModal = ref(false)
const props = defineProps<{
  candidateId: string;
}>();

const toast = useToast();
const loading = ref(true);
const candidate = ref<any>(null);
const assignments = ref<any[]>([]);

const fetchCandidateData = async () => {
  try {
    const candidatePromise = apiClient.get(`/candidates/${props.candidateId}`);
    const assignmentsPromise = apiClient.get(`/candidates/${props.candidateId}/assignments`);

    const [candidateResponse, assignmentsResponse] = await Promise.all([
      candidatePromise,
      assignmentsPromise,
    ]);

    candidate.value = candidateResponse.data;
    assignments.value = assignmentsResponse.data;
  } catch (error) {
    toast.error("Aday bilgileri getirilirken bir hata oluştu.");
  } finally {
    loading.value = false;
  }
};
const handleMmpiImported = () => {
  showImportModal.value = false;
  toast.info("İçe aktarma tamamlandı. Puanlama arka planda devam ediyor, liste güncelleniyor...");
  fetchCandidateData(); // İçe aktarma sonrası listeyi yenile
};
const formatDate = (dateString: string | null) => {
  if (!dateString) return '-';
  return format(new Date(dateString), 'dd.MM.yyyy HH:mm');
};

const getStatusClass = (status: string) => {
  return {
    'bg-yellow-100 text-yellow-800': status === 'Pending',
    'bg-blue-100 text-blue-800': status === 'InProgress',
    'bg-green-100 text-green-800': status === 'Completed',
    'bg-red-100 text-red-800': status === 'Expired',
  };
};

// --- YENİ METOT ---
const handleTestAssigned = () => {
  showAssignModal.value = false;
  toast.success("Sınav başarıyla atandı. Liste güncelleniyor...");
  // Atama listesini yenilemek için veriyi tekrar çekiyoruz.
  fetchCandidateData();
};
const authStore = useAuthStore(); // <-- STORE'U KULLANIMA AL

onMounted(fetchCandidateData);

const answerAnalysis = ref<any>(null); // YENİ: Cevap analizi için state
const loadingAnalysis = ref(false); // YENİ: Analiz yükleme durumu

const fetchAnswerAnalysis = async (assignmentId: string) => {
  loadingAnalysis.value = true;
  try {
    const response = await apiClient.get(`/test-results/${assignmentId}/answer-analysis`);
    answerAnalysis.value = response.data;
    console.log('Cevap Analizi:', response.data);
    toast.success("Cevap analizi başarıyla getirildi!");
  } catch (error) {
    toast.error("Cevap analizi getirilirken bir hata oluştu.");
    console.error('Hata:', error);
  } finally {
    loadingAnalysis.value = false;
  }
};
</script>

<template>

  <div class="container mx-auto p-6">
    <div v-if="loading" class="text-center py-10">Yükleniyor...</div>

    <div v-else-if="candidate" class="space-y-8">
      <div class="bg-white p-6 rounded-lg shadow-md flex items-start space-x-6">
        <img class="h-32 w-32 rounded-full object-cover ring-4 ring-white"
             :src="resolveApiUrl(candidate.profilePictureUrl) || `https://ui-avatars.com/api/?name=${candidate.fullName.replace(' ', '+')}`"
             :alt="candidate.fullName">
        <div class="flex-grow">
          <h1 class="text-3xl font-bold text-gray-800">{{ candidate.fullName }}</h1>
          <p class="text-lg text-gray-500">{{ candidate.email }}</p>
          <div class="mt-4 grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-sm text-gray-600">
            <p><strong class="font-medium text-gray-800">Yaş:</strong> {{ candidate.age || '-' }}</p>
            <p><strong class="font-medium text-gray-800">Cinsiyet:</strong> {{ candidate.gender || '-' }}</p>
            <p><strong class="font-medium text-gray-800">Medeni Hal:</strong> {{ candidate.maritalStatus || '-' }}</p>
            <p><strong class="font-medium text-gray-800">Eğitim:</strong> {{ candidate.educationLevel || '-' }}</p>
            <p><strong class="font-medium text-gray-800">Meslek:</strong> {{ candidate.profession || '-' }}</p>
            <p><strong class="font-medium text-gray-800">Profil Onayı:</strong>
              <span :class="candidate.isProfileConfirmed ? 'text-green-600' : 'text-red-600'">
                {{ candidate.isProfileConfirmed ? 'Onaylandı' : 'Onaylanmadı' }}
              </span>
            </p>
          </div>

        </div>
      </div>

      <div class="flex items-start space-x-3">

        <button
            @click="showAssignModal = true"
            class="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center whitespace-nowrap">
          <i class="mdi mdi-clipboard-text-plus-outline mr-2"></i>
          Yeni Sınav Ata
        </button>




        <button
            @click="showImportModal = true"
            class="bg-teal-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-teal-700 flex items-center whitespace-nowrap">
          <i class="mdi mdi-file-upload-outline mr-2"></i>
          MMPI İçe Aktar (CSV)
        </button>
      </div>

      <div class="bg-white p-6 rounded-lg shadow-md">
        <h2 class="text-xl font-bold text-gray-800 mb-4">Atanan Sınavlar</h2>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sınav Adı</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Atanma Tarihi</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bitiş Tarihi</th>
              <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Rapor</th>
              <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Manuel Başlat</th>
              <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Cevap Analizi</th>


            </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
            <tr v-if="assignments.length === 0">
              <td colspan="5" class="text-center py-6 text-gray-500">Bu adaya atanmış herhangi bir sınav bulunamadı.</td>
            </tr>
            <tr v-for="assignment in assignments" :key="assignment.assignmentId">

              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ assignment.testTitle }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm">
                  <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full" :class="getStatusClass(assignment.status)">
                    {{ assignment.status }}
                  </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatDate(assignment.createdAt) }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatDate(assignment.expiresAt) }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-center">
                <RouterLink
                    v-if="assignment.status === 'Completed'"
                    :to="{ name: 'test-results', params: { assignmentId: assignment.assignmentId } }"
                    class="text-green-600 hover:text-green-800 hover:underline"
                    title="Sonuç Raporunu Görüntüle">
                  <i class="mdi mdi-file-chart-outline text-xl"></i>
                </RouterLink>



                <span v-else class="text-gray-400">-</span>
              </td>


              <td v-if="authStore.isDeveloper" class="px-6 py-4 whitespace-nowrap text-sm text-center">
                <a :href="`/take-test/${assignment.assignmentId}`" target="_blank" class="text-indigo-600 hover:text-indigo-800 hover:underline" title="Sınavı yeni sekmede aç">
                  Sınavı Başlat
                </a>
              </td>

              <td class="px-6 py-4 whitespace-nowrap text-sm text-center">
                <a :href="`/take-test/${assignment.assignmentId}`" target="_blank"
                   class="bg-orange-300 text-white px-3 py-1 rounded hover:bg-orange-500 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-1 mx-auto"

                  title="Sınavı yeni sekmede aç">
                  Başlat
                </a>
              </td>

              <!-- YENİ: Cevap Analizi Butonu -->
              <td class="px-6 py-4 whitespace-nowrap text-sm text-center">
                <button
                    v-if="assignment.status === 'Completed'"
                    @click="fetchAnswerAnalysis(assignment.assignmentId)"
                    :disabled="loadingAnalysis"
                    class="bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-1 mx-auto"
                    title="Cevap Analizini Getir">
                  <i class="mdi mdi-chart-box-outline"></i>
                  {{ loadingAnalysis ? 'Yükleniyor...' : 'İndir' }}
                </button>
                <span v-else class="text-gray-400">-</span>
              </td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <AssignTestModal
        v-if="showAssignModal && candidate"
        :candidate-ids="[candidate.id]"
        @close="showAssignModal = false"
        @success="handleTestAssigned"
    />
    <ImportMmpiModal
        v-if="showImportModal && candidate"
        :candidate-id="candidate.id"
        @close="showImportModal = false"
        @success="handleMmpiImported"
    />
  </div>
</template>