<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import apiClient from '@/api/apiClient';
import { notify } from '@/services/notificationService';
import { resolveApiUrl } from '@/utils/urlHelper';

// MODAL'LARIN IMPORT'LARI
import CandidateFormModal from '@/components/Candidate/CandidateFormModal.vue';
import AssignTestModal from "@/components/TestAssignments/AssignTestModal.vue";
import BulkImportModal from "@/components/Candidate/BulkImportModal.vue";

const router = useRouter();

// STATE TANIMLARI
const candidates = ref<any[]>([]);
const paginationData = ref<any>({});
const loading = ref(true);
const activeTab = ref<'active' | 'archived'>('active');
const searchTerm = ref('');
const pageSize = ref(30);
const selectedCandidates = ref<string[]>([]);
const tabCounts = ref({ active: 0, archived: 0 });

// MODAL STATE'LERİ
const showAssignModal = ref(false);
const showCandidateFormModal = ref(false);
const showBulkImportModal = ref(false);
const isEditMode = ref(false);
const candidateToEdit = ref<any>(null);

// COMPUTED
const allSelected = computed({
  get: () => candidates.value.length > 0 && selectedCandidates.value.length === candidates.value.length,
  set: (value: boolean) => {
    selectedCandidates.value = value ? candidates.value.map(c => c.id) : [];
  }
});

// ============================================
// API ÇAĞRILARI
// ============================================

const fetchCandidates = async (page = 1) => {
  loading.value = true;
  selectedCandidates.value = [];
  try {
    const params = {
      pageNumber: page,
      pageSize: pageSize.value,
      searchTerm: searchTerm.value,
      isArchived: activeTab.value === 'archived'
    };
    const response = await apiClient.get('/candidates', { params });
    candidates.value = response.data.items;
    paginationData.value = response.data;
  } catch {
    // Interceptor zaten hatayı handle ediyor
  } finally {
    loading.value = false;
  }
};

const fetchTabCounts = async () => {
  try {
    const response = await apiClient.get('/candidates/counts');
    tabCounts.value = response.data;
  } catch (error) {
    console.error("Sekme sayıları getirilirken hata oluştu:", error);
  }
};

// YARDIMCI FONKSİYON - Tüm veriyi yenile
const refreshData = async () => {
  await Promise.all([
    fetchCandidates(paginationData.value.pageNumber || 1),
    fetchTabCounts()
  ]);
};

// ============================================
// TAB İŞLEMLERİ
// ============================================

const changeTab = (tab: 'active' | 'archived') => {
  activeTab.value = tab;
  fetchCandidates(1);
};

// ============================================
// MODAL İŞLEMLERİ
// ============================================

const openCreateModal = () => {
  isEditMode.value = false;
  candidateToEdit.value = null;
  showCandidateFormModal.value = true;
};

const openEditModal = (candidate: any) => {
  isEditMode.value = true;
  candidateToEdit.value = candidate;
  showCandidateFormModal.value = true;
};

// ============================================
// EVENT HANDLER'LAR
// ============================================

const handleCandidateSaved = async () => {
  showCandidateFormModal.value = false;
  await refreshData();
};

const onAssignmentSuccess = async () => {
  showAssignModal.value = false;
  selectedCandidates.value = [];
  notify.custom.assigned('Testler');
  await fetchTabCounts();
};

const onBulkImportSuccess = async () => {
  showBulkImportModal.value = false;
  await refreshData();
};

const handleArchiveStatusChange = async (candidate: any) => {
  const newStatus = !candidate.isArchived;
  const actionText = newStatus ? 'arşivlemek' : 'arşivden çıkarmak';

  if (confirm(`'${candidate.fullName}' adlı adayı ${actionText} istediğinizden emin misiniz?`)) {
    try {
      const command = {
        candidateId: candidate.id,
        isArchived: newStatus
      };
      await apiClient.post(`/candidates/${candidate.id}/archive-status`, command);

      if (newStatus) {
        notify.crud.archived('Aday');
      } else {
        notify.crud.unarchived('Aday');
      }

      await refreshData();
    } catch {
      // Interceptor zaten hatayı handle ediyor
    }
  }
};

const handleDeleteCandidate = async (candidateId: string) => {
  try {
    await apiClient.delete(`/candidates/${candidateId}`);
    notify.crud.deleted('Aday');
    showCandidateFormModal.value = false;
    await refreshData();
  } catch {
    // Interceptor zaten hatayı handle ediyor
  }
};

// ============================================
// WATCHERS
// ============================================

let debounceTimer: number;
watch(searchTerm, () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => fetchCandidates(1), 500);
});

watch(pageSize, () => fetchCandidates(1));

// ============================================
// LIFECYCLE
// ============================================

onMounted(async () => {
  await refreshData();
});
</script>

<template>
  <div class="container mx-auto p-6">
    <div class="flex justify-between items-center mb-4">
      <h1 class="text-2xl font-bold text-gray-800">Aday Yönetimi</h1>
      <div class="flex items-center space-x-4">
        <button v-if="selectedCandidates.length > 0" @click="showAssignModal = true" class="bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700">
          Seçili ({{ selectedCandidates.length }}) Adaya Test Ata
        </button>
        <button @click="openCreateModal" class="bg-indigo-600 text-white font-bold py-2 px-4 rounded hover:bg-indigo-700">
          Yeni Aday Ekle
        </button>
        <button
            @click="showBulkImportModal = true"
            class="bg-teal-600 text-white font-bold py-2 px-4 rounded hover:bg-teal-700">
          Toplu İşlemler
        </button>
      </div>
    </div>

    <div class="flex justify-between items-center mb-4">
      <div class="border-b border-gray-200">
        <nav class="-mb-px flex space-x-8">
          <button @click="changeTab('active')" :class="[activeTab === 'active' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300']" class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">
            Aktif Adaylar <span class="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-800">{{ tabCounts.active }}</span>
          </button>
          <button @click="changeTab('archived')" :class="[activeTab === 'archived' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300']" class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">
            Arşiv <span class="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-800">{{ tabCounts.archived }}</span>
          </button>
        </nav>
      </div>
      <div class="w-full md:w-1/3">
        <input v-model="searchTerm" type="text" placeholder="Aday ara (İsim, E-posta, Kod...)" class="w-full px-3 py-2 border rounded shadow-sm"/>
      </div>
    </div>

    <div class="bg-white shadow rounded-lg overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
        <tr>
          <th class="p-4"><input type="checkbox" v-model="allSelected" /></th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ad Soyad</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Departman</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aday Tipi</th>
          <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Eylemler</th>
        </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
        <tr v-if="loading"><td colspan="5" class="text-center py-8">Yükleniyor...</td></tr>
        <template v-else>
          <tr v-if="candidates.length > 0" v-for="candidate in candidates" :key="candidate.id">
            <td class="p-4"><input type="checkbox" :value="candidate.id" v-model="selectedCandidates" /></td>
            <td class="px-6 py-4 whitespace-nowrap">
              <RouterLink :to="{ name: 'candidate-detail', params: { candidateId: candidate.id } }" class="hover:underline">
                <div class="flex items-center">
                  <div class="flex-shrink-0 h-10 w-10">
                    <img class="h-10 w-10 rounded-full object-cover" :src="resolveApiUrl(candidate.profilePictureUrl) || `https://ui-avatars.com/api/?name=${candidate.fullName.replace(' ', '+')}&background=random&color=fff`" :alt="candidate.fullName">
                  </div>
                  <div class="ml-4">
                    <div class="text-sm font-medium text-gray-900">{{ candidate.fullName }}</div>
                    <div class="text-sm text-gray-500">{{ candidate.email }}</div>
                  </div>
                </div>
              </RouterLink>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ candidate.department }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ candidate.candidateType }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
              <button @click="openEditModal(candidate)" class="text-gray-500 hover:text-indigo-600" title="Düzenle"><i class="mdi mdi-pencil text-xl"></i></button>
              <button @click="handleArchiveStatusChange(candidate)" class="text-gray-500 hover:text-yellow-600" :title="candidate.isArchived ? 'Arşivden Çıkar' : 'Arşivle'">
                <i class="mdi text-xl" :class="candidate.isArchived ? 'mdi-archive-arrow-up-outline' : 'mdi-archive-arrow-down-outline'"></i>
              </button>
            </td>
          </tr>
          <tr v-else><td colspan="5" class="text-center py-10 text-gray-500">Bu sekmede aday bulunamadı.</td></tr>
        </template>
        </tbody>
      </table>
    </div>

    <div v-if="!loading && paginationData && paginationData.totalPages > 1" class="flex items-center justify-between mt-4">
      <p class="text-sm text-gray-700">
        Toplam {{ paginationData.totalCount }} kayıttan {{ (paginationData.pageNumber - 1) * paginationData.pageSize + 1 }}-{{ Math.min(paginationData.pageNumber * paginationData.pageSize, paginationData.totalCount) }} arası gösteriliyor.
      </p>
      <div class="space-x-2">
        <button @click="fetchCandidates(paginationData.pageNumber - 1)" :disabled="!paginationData.hasPreviousPage" class="px-4 py-2 text-sm border rounded disabled:opacity-50">
          Önceki
        </button>
        <button @click="fetchCandidates(paginationData.pageNumber + 1)" :disabled="!paginationData.hasNextPage" class="px-4 py-2 text-sm border rounded disabled:opacity-50">
          Sonraki
        </button>
      </div>
    </div>

    <CandidateFormModal
        v-if="showCandidateFormModal"
        :is-edit-mode="isEditMode"
        :candidate-data="candidateToEdit"
        @close="showCandidateFormModal = false"
        @saved="handleCandidateSaved"
        @delete="handleDeleteCandidate"
    />
    <AssignTestModal
        v-if="showAssignModal"
        :candidate-ids="selectedCandidates"
        @close="showAssignModal = false"
        @success="onAssignmentSuccess"
    />
    <BulkImportModal
        v-if="showBulkImportModal"
        @close="showBulkImportModal = false"
        @success="onBulkImportSuccess"
    />
  </div>
</template>