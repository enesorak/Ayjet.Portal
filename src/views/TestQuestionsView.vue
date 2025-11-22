<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import apiClient from '@/api/apiClient';
import { useToast } from 'vue-toastification';

// --- PROPS & STATE ---
const props = defineProps<{
  testId: string;
}>();

const router = useRouter();
const toast = useToast();

const questions = ref<any[]>([]);
const paginationData = ref<any>({});
const loading = ref(true);
const searchTerm = ref('');
const pageSize = ref(25); // Sayfa başına gösterilecek varsayılan soru sayısı

// Modal States
const showCreateEditModal = ref(false);
const showBulkImportModal = ref(false);
const isEditMode = ref(false);

// Form State
const getInitialFormState = () => ({
  id: 0,
  text: '',
  language: 'tr-TR',
  difficultyLevel: 3,
  questionCode: '',
  displayOrder: null as number | null,
  options: [
    { id: null, text: '', isCorrect: true },
    { id: null, text: '', isCorrect: false },
  ]
});
const formQuestion = ref(getInitialFormState());

// Bulk Import State
const fileToUpload = ref<File | null>(null);
const isUploading = ref(false);

// Computed Properties
const modalTitle = computed(() => isEditMode.value ? 'Soruyu Düzenle' : 'Yeni Soru Oluştur');
const submitButtonText = computed(() => isEditMode.value ? 'Güncelle' : 'Soruyu Kaydet');

// --- METHODS ---
const fetchQuestions = async (page = 1) => {
  loading.value = true;
  try {
    const response = await apiClient.get(`/testdefinitions/${props.testId}/questions`, {
      params: {
        searchTerm: searchTerm.value,
        pageNumber: page,
        pageSize: pageSize.value
      }
    });
    questions.value = response.data.items;
    paginationData.value = response.data;
  } catch (error) {
    toast.error("Sorular getirilirken hata oluştu.");
  } finally {
    loading.value = false;
  }
};

const handleGoToPage = (page: number) => {
  if (page > 0 && page <= paginationData.value.totalPages) {
    fetchQuestions(page);
  }
};

const handleEditClick = (question: any) => {
  if (question.testType === 'Psychometric') {
    router.push({ name: 'psychometric-question-editor', params: { testId: props.testId, id: question.id } });
  } else {
    isEditMode.value = true;
    // Düzenlenecek sorunun verilerini form state'ine kopyala
    formQuestion.value = {
      id: question.id,
      text: question.text,
      language: question.language,
      difficultyLevel: question.difficultyLevel,
      questionCode: question.questionCode,
      displayOrder: question.displayOrder,
      options: JSON.parse(JSON.stringify(question.options || []))
    };
    showCreateEditModal.value = true;
  }
};

const openCreateModal = () => {
  isEditMode.value = false;
  formQuestion.value = getInitialFormState();
  showCreateEditModal.value = true;
};

const handleFormSubmit = async () => {
  try {
    if (isEditMode.value) {
      await apiClient.put(`/questions/${formQuestion.value.id}`, formQuestion.value);
      toast.success("Soru başarıyla güncellendi!");
    } else {
      await apiClient.post(`/testdefinitions/${props.testId}/questions`, formQuestion.value);
      toast.success("Yeni soru başarıyla eklendi!");
    }
    showCreateEditModal.value = false;
    await fetchQuestions(paginationData.value.pageNumber || 1);
  } catch (err: any) {
    toast.error(err.response?.data?.Message || "İşlem sırasında bir hata oluştu.");
  }
};

const handleDelete = async (question: any) => {
  if (confirm(`'${question.text}' sorusunu silmek istediğinizden emin misiniz? (Bu işlem soruyu pasif hale getirir)`)) {
    try {
      await apiClient.delete(`/questions/${question.id}`);
      toast.success("Soru başarıyla pasif hale getirildi.");
      await fetchQuestions(paginationData.value.pageNumber || 1);
    } catch (error) {
      toast.error("Silme işlemi sırasında bir hata oluştu.");
    }
  }
};

const addOption = () => {
  if (formQuestion.value.options.length < 5) {
    formQuestion.value.options.push({ id: null, text: '', isCorrect: false });
  }
};

const removeOption = (index: number) => {
  if (formQuestion.value.options.length > 2) {
    const isRemovingCorrect = formQuestion.value.options[index].isCorrect;
    formQuestion.value.options.splice(index, 1);
    if (isRemovingCorrect && formQuestion.value.options.length > 0) {
      setCorrectAnswer(0);
    }
  }
};

const setCorrectAnswer = (selectedIndex: number) => {
  formQuestion.value.options.forEach((option, index) => {
    option.isCorrect = index === selectedIndex;
  });
};

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files) fileToUpload.value = target.files[0];
};

const downloadTemplate = async () => {
  try {
    const response = await apiClient.get('/testdefinitions/questions/bulk-import-template', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    const header = response.headers['content-disposition'];
    const filename = header ? header.split('filename=')[1].replaceAll('"', '') : 'SoruYuklemeSablonu.xlsx';
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    toast.error("Şablon indirilirken bir hata oluştu.");
  }
};

const handleBulkUpload = async () => {
  if (!fileToUpload.value) { toast.error("Lütfen bir dosya seçin."); return; }
  isUploading.value = true;
  const formData = new FormData();
  formData.append('file', fileToUpload.value);
  try {
    const response = await apiClient.post(`/testdefinitions/${props.testId}/questions/bulk-import`, formData);
    const result = response.data;
    toast.success(`${result.successCount} soru başarıyla eklendi.`);
    if (result.failedCount > 0) {
      toast.warning(`${result.failedCount} satırda hata oluştu.`);
      console.warn("Yükleme Hataları:", result.errors);
    }
    showBulkImportModal.value = false;
    await fetchQuestions();
  } catch (error) {
    toast.error("Dosya yüklenirken bir hata oluştu.");
  } finally {
    isUploading.value = false;
    fileToUpload.value = null;
  }
};

// --- LIFECYCLE & WATCHERS ---
let debounceTimer: number;
watch(searchTerm, () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    fetchQuestions(1);
  }, 500);
});

watch(pageSize, () => {
  fetchQuestions(1);
});

onMounted(fetchQuestions);
</script>

<template>
  <div class="container mx-auto p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-800">Soru Yönetimi</h1>
      <div>
        <button @click="showBulkImportModal = true" class="bg-teal-600 text-white font-bold py-2 px-4 rounded hover:bg-teal-700 transition-colors mr-4">Toplu Soru Yükle</button>
        <button @click="openCreateModal" class="bg-indigo-600 text-white font-bold py-2 px-4 rounded hover:bg-indigo-700 transition-colors">Yeni Soru Ekle</button>
      </div>
    </div>

    <div class="mb-4">
      <input v-model="searchTerm" type="text" placeholder="Soru metni veya koduna göre ara..." class="w-full px-3 py-2 border rounded shadow-sm"/>
    </div>

    <div class="bg-white shadow rounded-lg overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
        <tr>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sıra</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kod</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Soru Metni</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dil</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zorluk</th>
          <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Eylemler</th>
        </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
        <tr v-if="loading"><td colspan="6" class="text-center py-4">Yükleniyor...</td></tr>
        <template v-else-if="questions.length > 0">
          <tr v-for="question in questions" :key="question.id">
            <td class="px-6 py-4">{{ question.displayOrder }}</td>
            <td class="px-6 py-4 font-mono text-sm">{{ question.questionCode }}</td>
            <td class="px-6 py-4 max-w-lg truncate" :title="question.text">{{ question.text }}</td>
            <td class="px-6 py-4 text-sm">{{ question.language }}</td>
            <td class="px-6 py-4 text-sm">{{ question.difficultyLevel }}</td>
            <td class="px-6 py-4 text-right text-sm font-medium space-x-4">
              <button @click="handleEditClick(question)" class="text-gray-500 hover:text-indigo-600" title="Düzenle"><i class="mdi mdi-pencil text-xl"></i></button>
              <button @click="handleDelete(question)" class="text-gray-500 hover:text-red-600" title="Sil"><i class="mdi mdi-delete text-xl"></i></button>
            </td>
          </tr>
        </template>
        <tr v-else><td colspan="6" class="text-center py-4 text-gray-500">Sonuç bulunamadı.</td></tr>
        </tbody>
      </table>
    </div>

    <div class="flex items-center justify-between mt-4" v-if="!loading && paginationData.totalCount > 0">
      <div class="flex items-center space-x-2">
        <span class="text-sm text-gray-700">Sayfa Başına:</span>
        <select v-model.number="pageSize" class="border rounded px-2 py-1 bg-white"><option>10</option><option>25</option><option>50</option><option>100</option></select>
      </div>
      <p class="text-sm text-gray-700">Toplam {{ paginationData.totalCount }} sorudan {{ (paginationData.pageNumber - 1) * paginationData.pageSize + 1 }}-{{ Math.min(paginationData.pageNumber * paginationData.pageSize, paginationData.totalCount) }} arası gösteriliyor.</p>
      <div class="flex items-center space-x-2">
        <button @click="fetchQuestions(paginationData.pageNumber - 1)" :disabled="!paginationData.hasPreviousPage" class="px-4 py-2 text-sm border rounded disabled:opacity-50">Önceki</button>
        <div class="flex items-center">
          <input v-model.number="goToPageInput" @keyup.enter="handleGoToPage" type="number" placeholder="Sayfa..." class="w-16 px-2 py-1 border rounded-l" />
          <button @click="handleGoToPage" class="bg-gray-200 px-3 py-1 border-y border-r rounded-r hover:bg-gray-300">Git</button>
        </div>
        <button @click="fetchQuestions(paginationData.pageNumber + 1)" :disabled="!paginationData.hasNextPage" class="px-4 py-2 text-sm border rounded disabled:opacity-50">Sonraki</button>
      </div>
    </div>

    <div v-if="showCreateEditModal" class="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full flex items-center justify-center z-50">
      <div class="bg-white p-8 rounded-lg shadow-xl w-full max-w-2xl">
        <h2 class="text-xl font-bold mb-6">{{ modalTitle }}</h2>
        <form @submit.prevent="handleFormSubmit">
          <div class="mb-4"><label class="block text-gray-700 font-bold mb-2">Soru Metni</label><textarea v-model="formQuestion.text" class="w-full px-3 py-2 border rounded" required rows="3"></textarea></div>
          <div class="mb-4"><label class="block text-gray-700 font-bold mb-2">Soru Dili</label><select v-model="formQuestion.language" class="w-full px-3 py-2 border rounded bg-white"><option value="tr-TR">Türkçe</option><option value="en-US">English</option></select></div>
          <div class="grid grid-cols-3 gap-4 mb-4">
            <div><label class="block text-gray-700 font-bold mb-2">Soru Kodu</label><input v-model="formQuestion.questionCode" type="text" placeholder="Otomatik" class="w-full px-3 py-2 border rounded"></div>
            <div><label class="block text-gray-700 font-bold mb-2">Sıra No</label><input v-model.number="formQuestion.displayOrder" type="number" placeholder="Otomatik" class="w-full px-3 py-2 border rounded"></div>
            <div><label class="block text-gray-700 font-bold mb-2">Zorluk (1-5)</label><input v-model.number="formQuestion.difficultyLevel" type="number" min="1" max="5" class="w-full px-3 py-2 border rounded"></div>
          </div>
          <div class="mb-4">
            <label class="block text-gray-700 font-bold mb-2">Seçenekler (Doğru olanı işaretleyin)</label>
            <div v-for="(option, index) in formQuestion.options" :key="index" class="flex items-center space-x-2 mb-2">
              <input type="radio" name="correctAnswer" :value="index" :checked="option.isCorrect" @change="setCorrectAnswer(index)" class="form-radio h-5 w-5 text-indigo-600">
              <input v-model="option.text" type="text" class="flex-grow px-3 py-2 border rounded" placeholder="Seçenek metni" required>
              <button @click.prevent="removeOption(index)" type="button" class="text-red-500 hover:text-red-700" v-if="formQuestion.options.length > 2"><i class="mdi mdi-delete"></i></button>
            </div>
            <button @click.prevent="addOption" type="button" class="text-sm text-indigo-600 hover:text-indigo-800 mt-2" v-if="formQuestion.options.length < 5">+ Seçenek Ekle</button>
          </div>
          <div class="flex justify-end space-x-4 mt-8">
            <button type="button" @click="showCreateEditModal = false" class="bg-gray-300 px-4 py-2 rounded">İptal</button>
            <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded">{{ submitButtonText }}</button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="showBulkImportModal" class="fixed inset-0 bg-gray-600 bg-opacity-75 h-full w-full flex items-center justify-center z-50">
      <div class="bg-white p-8 rounded-lg shadow-xl w-full max-w-lg">
        <h2 class="text-xl font-bold mb-4">Toplu Soru Yükle</h2>
        <p class="text-gray-600 mb-4">Lütfen aşağıdaki şablonu indirip sorularınızı bu formata göre doldurun ve ardından dosyayı seçip yükleyin.</p>
        <button type="button" @click="downloadTemplate" class="inline-flex items-center bg-green-600 text-white font-bold py-2 px-4 rounded hover:bg-green-700 mb-6 transition-colors"><i class="mdi mdi-file-excel-outline mr-2"></i>Şablonu İndir</button>
        <form @submit.prevent="handleBulkUpload">
          <div>
            <label class="block text-gray-700 font-bold mb-2">Excel Dosyasını Seçin (.xlsx)</label>
            <input type="file" @change="handleFileChange" accept=".xlsx" class="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
          </div>
          <div class="flex justify-end space-x-4 mt-8">
            <button type="button" @click="showBulkImportModal = false" class="bg-gray-300 px-4 py-2 rounded">İptal</button>
            <button type="submit" :disabled="!fileToUpload || isUploading" class="bg-indigo-600 text-white px-4 py-2 rounded disabled:opacity-50"><span v-if="isUploading">Yükleniyor...</span><span v-else>Yükle</span></button>
          </div>
        </form>
      </div>
    </div>

  </div>
</template>