<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import apiClient from '@/api/apiClient';
import { useToast } from 'vue-toastification';
import TestDefinitionRowSkeleton from '@/components/skeletons/TestDefinitionRowSkeleton.vue';

// --- STATE ---
const tests = ref<any[]>([]);
const paginationData = ref<any>({}); // Sayfalama verilerini tutmak için
const loading = ref(true);
const showCreateEditModal = ref(false);
const isEditMode = ref(false);
const toast = useToast();
const router = useRouter();

const getInitialFormState = () => ({
  id: '',
  title: '',
  description: '',
  type: "MultipleChoice",
  defaultTimeLimitInMinutes: null as number | null,
  defaultQuestionCount: null as number | null,
  passingScore: null as number | null
});
const formTest = ref(getInitialFormState());

const modalTitle = computed(() => isEditMode.value ? 'Test Tanımını Düzenle' : 'Yeni Test Tanımı Oluştur');

// --- METHODS ---
const fetchTests = async (page = 1) => {
  loading.value = true;
  try {
    const response = await apiClient.get('/testdefinitions', {
      params: { pageNumber: page, pageSize: 10 }
    });
    // Doğru veri yapısını kullanıyoruz: response.data.items
    tests.value = response.data.items;
    paginationData.value = response.data;
  } catch (error) {
    toast.error("Test tanımları getirilirken hata oluştu.");
  } finally {
    loading.value = false;
  }
};

const handleEditClick = (test: any) => {
  isEditMode.value = true;
  formTest.value = { ...test };
  showCreateEditModal.value = true;
};

const openCreateModal = () => {
  isEditMode.value = false;
  formTest.value = getInitialFormState();
  showCreateEditModal.value = true;
};

const handleFormSubmit = async () => {
  try {
    if (isEditMode.value) {
      await apiClient.put(`/testdefinitions/${formTest.value.id}`, formTest.value);
      toast.success("Test başarıyla güncellendi.");
    } else {
      await apiClient.post('/testdefinitions', formTest.value);
      toast.success("Yeni test başarıyla oluşturuldu.");
    }
    showCreateEditModal.value = false;
    await fetchTests(paginationData.value.pageNumber || 1);
  } catch (err: any) {
    toast.error("İşlem sırasında bir hata oluştu.");
  }
};

const handleDelete = async (test: any) => {
  if (confirm(`'${test.title}' başlıklı testi silmek istediğinizden emin misiniz?`)) {
    try {
      await apiClient.delete(`/testdefinitions/${test.id}`);
      toast.success("Test başarıyla silindi (pasif hale getirildi).");
      await fetchTests(paginationData.value.pageNumber || 1);
    } catch (error) {
      toast.error("Silme işlemi sırasında hata oluştu.");
    }
  }
};

onMounted(fetchTests);
</script>

<template>
  <div class="container mx-auto p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-800">Test Yönetimi</h1>
      <button @click="openCreateModal" class="bg-indigo-600 text-white font-bold py-2 px-4 rounded hover:bg-indigo-700 transition-colors">
        Yeni Test Ekle
      </button>
    </div>

    <div class="bg-white shadow rounded-lg overflow-x-auto">
      <table class="min-w-full">
        <thead class="bg-gray-50">
        <tr>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Başlık</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tür</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Açıklama</th>
          <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Eylemler</th>
        </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
        <template v-if="loading">
          <TestDefinitionRowSkeleton v-for="n in 5" :key="`skel-${n}`" />
        </template>
        <template v-else-if="tests.length > 0">
          <tr v-for="test in tests" :key="test.id">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ test.title }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ test.type }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate">{{ test.description }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
              <RouterLink :to="{ name: 'test-questions', params: { testId: test.id } }" class="text-gray-500 hover:text-green-600" title="Soruları Yönet">
                <i class="mdi mdi-comment-question-outline text-xl"></i>
              </RouterLink>
              <button @click="handleEditClick(test)" class="text-gray-500 hover:text-indigo-600" title="Düzenle">
                <i class="mdi mdi-pencil text-xl"></i>
              </button>
              <button @click="handleDelete(test)" class="text-gray-500 hover:text-red-600" title="Sil">
                <i class="mdi mdi-delete text-xl"></i>
              </button>
            </td>
          </tr>
        </template>
        <tr v-else>
          <td colspan="4" class="px-6 py-4 text-center text-gray-500">Henüz hiç test tanımı oluşturulmamış.</td>
        </tr>
        </tbody>
      </table>
    </div>

    <div class="flex items-center justify-between mt-4" v-if="!loading && paginationData.totalCount > 0">
      <p class="text-sm text-gray-700">Toplam {{ paginationData.totalCount }} kayıttan {{ (paginationData.pageNumber - 1) * paginationData.pageSize + 1 }}-{{ Math.min(paginationData.pageNumber * paginationData.pageSize, paginationData.totalCount) }} arası gösteriliyor.</p>
      <div class="space-x-2">
        <button @click="fetchTests(paginationData.pageNumber - 1)" :disabled="!paginationData.hasPreviousPage" class="px-4 py-2 text-sm border rounded disabled:opacity-50">Önceki</button>
        <button @click="fetchTests(paginationData.pageNumber + 1)" :disabled="!paginationData.hasNextPage" class="px-4 py-2 text-sm border rounded disabled:opacity-50">Sonraki</button>
      </div>
    </div>

    <div v-if="showCreateEditModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">

      <div class="bg-white p-8 rounded-lg shadow-xl w-full max-w-lg">
        <h2 class="text-xl font-bold mb-4">{{ modalTitle }}</h2>

        <form @submit.prevent="handleFormSubmit" class="space-y-4">
          <div><label>Test Başlığı</label><input v-model="formTest.title" type="text" class="w-full mt-1 p-2 border rounded" required></div>
          <div><label>Açıklama</label><textarea v-model="formTest.description" class="w-full mt-1 p-2 border rounded"></textarea></div>
          <div><label>Test Türü</label><select v-model.number="formTest.type" class="w-full mt-1 p-2 border rounded bg-white"><option value="MultipleChoice">MultipleChoice</option><option value="Psychometric">Psychometric</option></select></div>
          <div><label>Varsayılan Soru Sayısı</label><input v-model.number="formTest.defaultQuestionCount" type="number" class="w-full mt-1 p-2 border rounded"></div>
          <div><label>Varsayılan Süre (Dakika)</label><input v-model.number="formTest.defaultTimeLimitInMinutes" type="number" class="w-full mt-1 p-2 border rounded"></div>
          <div><label>Geçme Notu (100 üzerinden)</label>
            <input v-model.number="formTest.passingScore" type="number" class="w-full mt-1 p-2 border rounded">

          </div>

        <div class="flex justify-end space-x-4 pt-4">
            <button type="button" @click="showCreateEditModal = false" class="bg-gray-300 px-4 py-2 rounded">İptal</button>
            <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded">Kaydet</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>