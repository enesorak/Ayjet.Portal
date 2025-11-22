<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import apiClient from '@/api/apiClient';
import { useToast } from 'vue-toastification';
import { resolveApiUrl } from '@/utils/urlHelper';

const props = defineProps<{
  candidateId: string;
}>();

const emit = defineEmits(['close', 'profile-updated']);
const toast = useToast();

const formData = ref<any>({});
const loading = ref(true);

const pictureFile = ref<File | null>(null);
const picturePreviewUrl = ref<string | null>(null);

// --- YENİ: Select/Option listeleri ---
const maritalStatusOptions = ['Bekar', 'Evli', 'Boşanmış', 'Dul'];
const educationLevelOptions = ['İlkokul', 'Ortaokul', 'Lise', 'Ön Lisans', 'Lisans', 'Yüksek Lisans', 'Doktora'];

const fetchCandidateProfile = async () => {
  loading.value = true;
  try {
    const response = await apiClient.get(`/candidates/${props.candidateId}`);
    formData.value = response.data; // Veriyi doğrudan forma ata
    picturePreviewUrl.value = resolveApiUrl(response.data.profilePictureUrl);

    console.log(formData.value);
  } catch (error) {
    toast.error("Aday profili getirilirken bir hata oluştu.");
    emit('close');
  } finally {
    loading.value = false;
  }
};

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    pictureFile.value = target.files[0];
    picturePreviewUrl.value = URL.createObjectURL(pictureFile.value);
  }
};

const saveProfile = async () => {
  try {
    await apiClient.put(`/candidates/${props.candidateId}/profile`, formData.value);

    if (pictureFile.value) {
      const pictureFormData = new FormData();
      pictureFormData.append('profilePicture', pictureFile.value);
      await apiClient.post(`/candidates/${props.candidateId}/profile-picture`, pictureFormData);
    }

    await apiClient.post(`/candidates/${props.candidateId}/confirm-profile`);

    toast.success("Bilgileriniz başarıyla güncellendi. Sınavınız şimdi başlayacak.");
    emit('profile-updated');
  } catch (error) {
    toast.error("Profil güncellenirken bir hata oluştu.");
  }
};

onMounted(fetchCandidateProfile);
</script>

<template>
  <div class="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full flex items-center justify-center z-50">
    <div class="bg-white p-8 rounded-lg shadow-xl w-full max-w-4xl">
      <div v-if="loading" class="text-center py-10">Profil Bilgileri Yükleniyor...</div>
      <div v-else>
        <h2 class="text-2xl font-bold mb-2">Profil Bilgileri</h2>
        <p class="text-gray-600 mb-6">Lütfen sınava başlamadan önce aşağıdaki bilgilerin doğruluğunu kontrol edip eksikleri tamamlayın.</p>
        <form @submit.prevent="saveProfile">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div class="md:col-span-1 flex flex-col items-center">
              <img class="h-40 w-40 rounded-full object-cover ring-4 ring-gray-200 mb-4" :src="picturePreviewUrl || `https://ui-avatars.com/api/?name=${formData.firstName}+${formData.lastName}`" alt="Profile Picture">
              <label for="picture-upload" class="cursor-pointer bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
                <span>Resim Değiştir</span>
                <input id="picture-upload" type="file" class="sr-only" @change="handleFileChange" accept="image/*">
              </label>
            </div>
            <div class="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label class="block font-medium">İsim*</label><input v-model="formData.firstName" type="text" class="w-full mt-1 p-2 border rounded" required></div>
              <div><label class="block font-medium">Soyisim*</label><input v-model="formData.lastName" type="text" class="w-full mt-1 p-2 border rounded" required></div>
              <div class="md:col-span-2"><label class="block font-medium">E-posta*</label><input v-model="formData.email" type="email" class="w-full mt-1 p-2 border rounded" required></div>
              <div><label class="block font-medium">Doğum Tarihi</label><input v-model="formData.birthDate" type="date" class="w-full mt-1 p-2 border rounded"></div>
              <div><label class="block font-medium">Cinsiyet</label><select v-model="formData.gender" class="w-full mt-1 p-2 border rounded bg-white"><option :value="null">Seçiniz</option><option :value="1">Erkek</option><option :value="2">Kadın</option></select></div>
              <div><label class="block font-medium">Initial Kodu</label><input v-model="formData.initialCode" type="text" class="w-full mt-1 p-2 border rounded"></div>
              <div><label class="block font-medium">Fleet Kodu</label><input v-model="formData.fleetCode" type="text" class="w-full mt-1 p-2 border rounded"></div>

              <div><label class="block font-medium">Eğitim Durumu</label>
                <select v-model="formData.educationLevel" class="w-full mt-1 p-2 border rounded bg-white">
                  <option :value="null">Seçiniz</option>
                  <option v-for="level in educationLevelOptions" :key="level" :value="level">{{ level }}</option>
                </select>
              </div>
              <div><label class="block font-medium">Medeni Hal</label>
                <select v-model="formData.maritalStatus" class="w-full mt-1 p-2 border rounded bg-white">
                  <option :value="null">Seçiniz</option>
                  <option v-for="status in maritalStatusOptions" :key="status" :value="status">{{ status }}</option>
                </select>
              </div>
              <div class="md:col-span-2"><label class="block font-medium">Meslek</label><input v-model="formData.profession" type="text" class="w-full mt-1 p-2 border rounded"></div>

            </div>
          </div>
          <div class="flex justify-end space-x-4 mt-8">
            <button type="submit" class="bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold text-lg">Kaydet ve Sınava Başla</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>