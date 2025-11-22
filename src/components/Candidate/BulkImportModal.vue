<script setup lang="ts">
import { ref } from 'vue';
import apiClient from '@/api/apiClient';
import { useToast } from 'vue-toastification';

const emit = defineEmits(['close', 'success']);
const toast = useToast();

const activeTab = ref<'candidates' | 'photos'>('candidates');
const candidateFile = ref<File | null>(null);
const photoZipFile = ref<File | null>(null);
const isUploading = ref(false);
const isDownloadingTemplate = ref(false); // Şablon indirme durumu

const resultInfo = ref<{
  successCount: number;
  failedCount: number;
  errors: string[];
} | null>(null);

const handleFileChange = (event: Event, type: 'candidates' | 'photos') => {
  resultInfo.value = null;
  const target = event.target as HTMLInputElement;
  if (!target.files || target.files.length === 0) {
    type === 'candidates' ? (candidateFile.value = null) : (photoZipFile.value = null);
    return;
  }
  const file = target.files[0];

  if (type === 'candidates') {
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      toast.error("Lütfen sadece .xlsx formatında bir dosya seçin.");
      candidateFile.value = null;
      target.value = '';
    } else {
      candidateFile.value = file;
    }
  } else {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      toast.error("Lütfen sadece .zip formatında bir dosya seçin.");
      photoZipFile.value = null;
      target.value = '';
    } else {
      photoZipFile.value = file;
    }
  }
};

// --- YENİ: ŞABLON İNDİRME FONKSİYONU ---
const downloadTemplate = async () => {
  isDownloadingTemplate.value = true;
  try {
    const response = await apiClient.get('/candidates/bulk-import-template', {
      responseType: 'blob', // ÖNEMLI: Dosya indirmek için blob kullanmalıyız
    });

    // Blob'u indirilebilir bir dosyaya dönüştür
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    // Dosya indirme için geçici bir link oluştur
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'AdayYuklemeSablonu.xlsx'; // İndirilecek dosya adı
    document.body.appendChild(link);
    link.click();

    // Temizlik
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast.success("Şablon dosyası indirildi.");
  } catch (error: any) {
    const msg = error.response?.data?.title || "Şablon indirilemedi.";
    toast.error(msg);
  } finally {
    isDownloadingTemplate.value = false;
  }
};

const handleUpload = async () => {
  if (activeTab.value === 'candidates') {
    await uploadCandidates();
  } else {
    await uploadPhotos();
  }
};

const uploadCandidates = async () => {
  if (!candidateFile.value) {
    toast.warning("Lütfen önce Aday Listesi şablonunu (.xlsx) seçin.");
    return;
  }
  isUploading.value = true;
  resultInfo.value = null;

  const formData = new FormData();
  formData.append('file', candidateFile.value);

  try {
    const response = await apiClient.post('/candidates/bulk-import-candidates', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    resultInfo.value = response.data;
    toast.success(`${response.data.successCount} aday başarıyla eklendi.`);
    if (response.data.failedCount > 0) {
      toast.warning(`${response.data.failedCount} aday eklenemedi. Detaylar için sonucu inceleyin.`);
    }
    emit('success');
  } catch (error: any) {
    const msg = error.response?.data?.title || "Yükleme sırasında bir hata oluştu.";
    toast.error(msg);
  } finally {
    isUploading.value = false;
  }
};

const uploadPhotos = async () => {
  if (!photoZipFile.value) {
    toast.warning("Lütfen önce bir Fotoğraf Arşivi (.zip) seçin.");
    return;
  }
  isUploading.value = true;
  resultInfo.value = null;

  const formData = new FormData();
  formData.append('file', photoZipFile.value);

  try {
    const response = await apiClient.post('/candidates/bulk-import-photos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    resultInfo.value = {
      successCount: response.data.successfullyMatched,
      failedCount: response.data.matchFailures.length,
      errors: response.data.matchFailures
    };
    toast.success(`${response.data.successfullyMatched} fotoğraf başarıyla eşleştirildi.`);
    if (response.data.matchFailures.length > 0) {
      toast.warning(`${response.data.matchFailures.length} fotoğraf eşleştirilemedi.`);
    }
    emit('success');
  } catch (error: any) {
    const msg = error.response?.data?.title || "Yükleme sırasında bir hata oluştu.";
    toast.error(msg);
  } finally {
    isUploading.value = false;
  }
};
</script>

<template>
  <div class="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
      <h2 class="text-xl font-bold mb-4">Toplu Aday İşlemleri</h2>

      <div class="border-b border-gray-200">
        <nav class="-mb-px flex space-x-8">
          <button
              @click="activeTab = 'candidates'"
              :class="[activeTab === 'candidates' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300']"
              class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
          >
            1. Toplu Aday Yükle (Excel)
          </button>
          <button
              @click="activeTab = 'photos'"
              :class="[activeTab === 'photos' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300']"
              class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
          >
            2. Toplu Fotoğraf Yükle (ZIP)
          </button>
        </nav>
      </div>

      <div class="py-6">
        <div v-show="activeTab === 'candidates'">
          <div class="flex justify-between items-center mb-1">
            <label for="candidateFile" class="block text-sm font-medium text-gray-700">
              Aday Listesi Dosyası (.xlsx)
            </label>

            <!-- DÜZELTİLMİŞ KISIM: <a> yerine <button> kullan -->
            <button
                @click="downloadTemplate"
                :disabled="isDownloadingTemplate"
                type="button"
                class="text-sm font-medium text-indigo-600 hover:text-indigo-500 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i class="mdi mdi-download-outline"></i>
              <span v-if="isDownloadingTemplate">İndiriliyor...</span>
              <span v-else>Şablon Dosyasını İndir</span>
            </button>
          </div>
          <p class="text-xs text-gray-500 mb-2">Lütfen indirdiğiniz şablona göre verileri doldurun.</p>
          <input
              id="candidateFile"
              type="file"
              accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              @change="handleFileChange($event, 'candidates')"
              class="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50"
          />
          <p v-if="candidateFile" class="text-xs text-gray-500 mt-1">Seçilen: {{ candidateFile.name }}</p>
        </div>

        <div v-show="activeTab === 'photos'">
          <label for="photoZipFile" class="block text-sm font-medium text-gray-700 mb-1">
            Fotoğraf Arşivi (.zip)
          </label>
          <p class="text-xs text-gray-500 mb-2">Dosya isimleri: `Ad_Soyad.jpeg` (veya .jpg) formatında olmalıdır.</p>
          <input
              id="photoZipFile"
              type="file"
              accept=".zip, application/zip"
              @change="handleFileChange($event, 'photos')"
              class="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50"
          />
          <p v-if="photoZipFile" class="text-xs text-gray-500 mt-1">Seçilen: {{ photoZipFile.name }}</p>
        </div>
      </div>

      <div v-if="resultInfo && !isUploading" class="mt-4 p-4 bg-gray-50 rounded border">
        <h4 class="font-semibold text-gray-800">İşlem Sonucu:</h4>
        <p class="text-green-600">Başarılı: {{ resultInfo.successCount }}</p>
        <p :class="[resultInfo.failedCount > 0 ? 'text-red-600' : 'text-gray-600']">Başarısız: {{ resultInfo.failedCount }}</p>
        <details v-if="resultInfo.errors && resultInfo.errors.length > 0" class="mt-2 text-xs">
          <summary class="cursor-pointer font-medium text-gray-600">Hata Detayları ({{ resultInfo.errors.length }})</summary>
          <ul class="list-disc list-inside pl-4 mt-1 max-h-32 overflow-y-auto">
            <li v-for="(error, index) in resultInfo.errors" :key="index">{{ error }}</li>
          </ul>
        </details>
      </div>

      <div class="mt-6 flex justify-end space-x-3">
        <button
            @click="emit('close')"
            :disabled="isUploading"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 disabled:opacity-50"
        >
          Kapat
        </button>
        <button
            @click="handleUpload"
            :disabled="isUploading || (activeTab === 'candidates' ? !candidateFile : !photoZipFile)"
            class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 disabled:opacity-50"
        >
          <span v-if="isUploading">Yükleniyor...</span>
          <span v-else>Şimdi Yükle</span>
        </button>
      </div>
    </div>
  </div>
</template>