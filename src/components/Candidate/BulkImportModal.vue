<script setup lang="ts">
import { ref } from 'vue';
import apiClient from '@/api/apiClient';
import { notify } from '@/services/notificationService';

const emit = defineEmits(['close', 'success']);

const activeTab = ref<'candidates' | 'photos'>('candidates');
const candidateFile = ref<File | null>(null);
const photoZipFile = ref<File | null>(null);
const isUploading = ref(false);
const isDownloadingTemplate = ref(false);

const resultInfo = ref<{
  successCount: number;
  failedCount: number;
  errors: string[];
} | null>(null);

// ============================================
// DOSYA SEÇİMİ
// ============================================

const handleFileChange = (event: Event, type: 'candidates' | 'photos') => {
  resultInfo.value = null;
  const target = event.target as HTMLInputElement;

  if (!target.files || target.files.length === 0) {
    type === 'candidates' ? (candidateFile.value = null) : (photoZipFile.value = null);
    return;
  }

  const file = target.files[0];
  const expectedExt = type === 'candidates' ? '.xlsx' : '.zip';
  const fileExt = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));

  if (fileExt !== expectedExt) {
    notify.warning(`Lütfen sadece ${expectedExt} formatında bir dosya seçin.`);
    target.value = '';
    type === 'candidates' ? (candidateFile.value = null) : (photoZipFile.value = null);
    return;
  }

  type === 'candidates' ? (candidateFile.value = file) : (photoZipFile.value = file);
};

// ============================================
// ŞABLON İNDİRME
// ============================================

const downloadTemplate = async () => {
  isDownloadingTemplate.value = true;
  try {
    const response = await apiClient.get('/candidates/bulk-import-template', {
      responseType: 'blob',
    });

    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'AdayYuklemeSablonu.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    notify.custom.downloaded('Şablon dosyası');
  } catch {
    // Interceptor zaten hatayı handle ediyor
  } finally {
    isDownloadingTemplate.value = false;
  }
};

// ============================================
// YÜKLEME İŞLEMLERİ
// ============================================

const handleUpload = async () => {
  if (activeTab.value === 'candidates') {
    await uploadCandidates();
  } else {
    await uploadPhotos();
  }
};

const uploadCandidates = async () => {
  if (!candidateFile.value) {
    notify.warning('Lütfen önce bir Excel dosyası (.xlsx) seçin.');
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

    // Tek akıllı notification
    notify.bulkResult(response.data, 'aday');

    // Sadece en az bir başarılı varsa success emit et
    if (response.data.successCount > 0) {
      emit('success');
    }
  } catch {
    // Interceptor zaten hatayı handle ediyor
  } finally {
    isUploading.value = false;
  }
};

const uploadPhotos = async () => {
  if (!photoZipFile.value) {
    notify.warning('Lütfen önce bir ZIP dosyası seçin.');
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

    // Tek akıllı notification
    notify.bulkResult(resultInfo.value, 'fotoğraf');

    if (response.data.successfullyMatched > 0) {
      emit('success');
    }
  } catch {
    // Interceptor zaten hatayı handle ediyor
  } finally {
    isUploading.value = false;
  }
};

// ============================================
// MODAL KAPATMA
// ============================================

const handleClose = () => {
  resultInfo.value = null;
  candidateFile.value = null;
  photoZipFile.value = null;
  emit('close');
};
</script>

<template>
  <div class="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
      <h2 class="text-xl font-bold mb-4">Toplu Aday İşlemleri</h2>

      <!-- TAB NAVİGASYONU -->
      <div class="border-b border-gray-200">
        <nav class="-mb-px flex space-x-8">
          <button
              @click="activeTab = 'candidates'; resultInfo = null"
              :class="[activeTab === 'candidates' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300']"
              class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
          >
            1. Toplu Aday Yükle (Excel)
          </button>
          <button
              @click="activeTab = 'photos'; resultInfo = null"
              :class="[activeTab === 'photos' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300']"
              class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
          >
            2. Toplu Fotoğraf Yükle (ZIP)
          </button>
        </nav>
      </div>

      <!-- TAB İÇERİKLERİ -->
      <div class="py-6">
        <!-- ADAY YÜKLEME TAB'I -->
        <div v-show="activeTab === 'candidates'">
          <div class="flex justify-between items-center mb-1">
            <label for="candidateFile" class="block text-sm font-medium text-gray-700">
              Aday Listesi Dosyası (.xlsx)
            </label>
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

        <!-- FOTOĞRAF YÜKLEME TAB'I -->
        <div v-show="activeTab === 'photos'">
          <label for="photoZipFile" class="block text-sm font-medium text-gray-700 mb-1">
            Fotoğraf Arşivi (.zip)
          </label>
          <p class="text-xs text-gray-500 mb-2">Dosya isimleri: <code>Ad_Soyad.jpeg</code> (veya .jpg) formatında olmalıdır.</p>
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

      <!-- SONUÇ GÖSTERME ALANI -->
      <div v-if="resultInfo && !isUploading" class="mt-4 p-4 rounded-lg border"
           :class="{
             'bg-green-50 border-green-200': resultInfo.failedCount === 0 && resultInfo.successCount > 0,
             'bg-red-50 border-red-200': resultInfo.successCount === 0 && resultInfo.failedCount > 0,
             'bg-yellow-50 border-yellow-200': resultInfo.successCount > 0 && resultInfo.failedCount > 0
           }">

        <h4 class="font-semibold text-gray-800 mb-2 flex items-center">
          <i class="mdi mr-2 text-lg"
             :class="{
               'mdi-check-circle text-green-600': resultInfo.failedCount === 0 && resultInfo.successCount > 0,
               'mdi-close-circle text-red-600': resultInfo.successCount === 0 && resultInfo.failedCount > 0,
               'mdi-alert-circle text-yellow-600': resultInfo.successCount > 0 && resultInfo.failedCount > 0
             }"></i>
          İşlem Sonucu
        </h4>

        <div class="flex space-x-6 text-sm">
          <p class="text-green-700">
            <i class="mdi mdi-check mr-1"></i>Başarılı: <strong>{{ resultInfo.successCount }}</strong>
          </p>
          <p :class="resultInfo.failedCount > 0 ? 'text-red-700' : 'text-gray-500'">
            <i class="mdi mdi-close mr-1"></i>Başarısız: <strong>{{ resultInfo.failedCount }}</strong>
          </p>
        </div>

        <!-- HATA DETAYLARI - AÇIK GÖSTER -->
        <div v-if="resultInfo.errors && resultInfo.errors.length > 0" class="mt-3">
          <p class="text-sm font-medium text-red-800 mb-2">
            <i class="mdi mdi-alert-outline mr-1"></i>Hata Detayları:
          </p>
          <ul class="text-xs text-red-700 bg-red-100 rounded p-3 max-h-40 overflow-y-auto space-y-1">
            <li v-for="(error, index) in resultInfo.errors" :key="index" class="flex items-start">
              <span class="text-red-400 mr-2">•</span>
              <span>{{ error }}</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- BUTONLAR -->
      <div class="mt-6 flex justify-end space-x-3">
        <button
            @click="handleClose"
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
          <span v-if="isUploading">
            <i class="mdi mdi-loading mdi-spin mr-1"></i>Yükleniyor...
          </span>
          <span v-else>Şimdi Yükle</span>
        </button>
      </div>
    </div>
  </div>
</template>