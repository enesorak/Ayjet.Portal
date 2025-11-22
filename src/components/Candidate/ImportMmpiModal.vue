<script setup lang="ts">
import { ref } from 'vue';
import apiClient from '@/api/apiClient';
import { useToast } from 'vue-toastification';

const props = defineProps<{
  candidateId: string;
}>();

const emit = defineEmits(['close', 'success']);

const toast = useToast();
const selectedFile = ref<File | null>(null);
const completedAt = ref<string>(''); // YYYY-MM-DD formatında olacak
const isUploading = ref(false);

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    const file = target.files[0];
    if (file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv')) {
      selectedFile.value = file;
    } else {
      toast.error("Lütfen sadece .csv formatında bir dosya seçin.");
      selectedFile.value = null;
      // Input'u temizle ki aynı dosyayı tekrar seçebilsin
      target.value = '';
    }
  } else {
    selectedFile.value = null;
  }
};

const uploadFile = async () => {
  if (!selectedFile.value) {
    toast.warning("Lütfen önce bir CSV dosyası seçin.");
    return;
  }

  isUploading.value = true;
  const formData = new FormData();
  formData.append('candidateId', props.candidateId);
  formData.append('answerFile', selectedFile.value);
  if (completedAt.value) {
    // Tarihi ISO formatına çevirip gönderelim (backend bunu parse edebilir)
    try {
      const date = new Date(completedAt.value);
      // Zaman dilimi sorunlarını önlemek için UTC'ye çevirip ISO string alalım
      formData.append('completedAtOverride', date.toISOString());
    } catch {
      toast.error("Geçersiz tarih formatı. Lütfen YYYY-MM-DD formatını kullanın.");
      isUploading.value = false;
      return;
    }
  }

  try {
    await apiClient.post('/test-assignments/import-mmpi-csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    toast.success("MMPI cevapları başarıyla içe aktarıldı ve puanlama başlatıldı.");
    emit('success'); // Başarı olayını tetikle
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || "İçe aktarma sırasında bir hata oluştu.";
    toast.error(errorMessage);
  } finally {
    isUploading.value = false;
  }
};
</script>

<template>
  <div class="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
      <h2 class="text-xl font-bold mb-4">Harici MMPI Cevaplarını İçe Aktar</h2>

      <div class="space-y-4">
        <div>
          <label for="csvFile" class="block text-sm font-medium text-gray-700 mb-1">
            Cevap CSV Dosyası (.csv)
          </label>
          <input
              id="csvFile"
              type="file"
              accept=".csv, text/csv"
              @change="handleFileChange"
              class="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-l-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
          />
          <p v-if="selectedFile" class="text-xs text-gray-500 mt-1">Seçilen dosya: {{ selectedFile.name }}</p>
        </div>

        <div>
          <label for="completedAt" class="block text-sm font-medium text-gray-700 mb-1">
            Tamamlanma Tarihi (Opsiyonel)
          </label>
          <input
              id="completedAt"
              type="date"
              v-model="completedAt"
              class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="YYYY-MM-DD"
          />
          <p class="text-xs text-gray-500 mt-1">Eğer boş bırakılırsa, içe aktarma zamanı kullanılır.</p>
        </div>
      </div>

      <div class="mt-6 flex justify-end space-x-3">
        <button
            @click="emit('close')"
            :disabled="isUploading"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          İptal
        </button>
        <button
            @click="uploadFile"
            :disabled="!selectedFile || isUploading"
            class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          <span v-if="isUploading">Yükleniyor...</span>
          <span v-else>İçe Aktar ve Puanla</span>
        </button>
      </div>
    </div>
  </div>
</template>