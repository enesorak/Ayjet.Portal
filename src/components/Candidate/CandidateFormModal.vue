<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import apiClient from '@/api/apiClient';
import { useToast } from 'vue-toastification';
import { resolveApiUrl } from '@/utils/urlHelper';

const props = defineProps<{
  isEditMode: boolean;
  candidateData: any | null;
}>();

//const emit = defineEmits(['close', 'saved']);

const emit = defineEmits<{
  close: []
  saved: []
  delete: [id: string]  // ← Bu satırı ekle
}>();
const toast = useToast();

const getInitialFormState = () => ({
  id: '',
  firstName: '',
  lastName: '',
  email: '',
  candidateType: 1,
  department: 1,
  gender: null as number | null,
  birthDate: null as string | null,
  initialCode: '',
  fleetCode: '',
  maritalStatus: '',
  profession: '',
  educationLevel: ''
});
const formData = ref(getInitialFormState());

const pictureFile = ref<File | null>(null);
const picturePreviewUrl = ref<string | null>(null);

const modalTitle = computed(() => props.isEditMode ? 'Adayı Düzenle' : 'Yeni Aday Oluştur');


const candidateTypeMap: { [key: string]: number } = { 'Student': 0, 'Employee': 1 };
const departmentMap: { [key: string]: number } = { 'HumanResources': 0, 'FlightOps': 1, 'CabinServices': 2, 'Maintenance': 3, 'GroundOps': 4 };
const genderMap: { [key: string]: number } = { 'Male': 1, 'Female': 2 };

const handleDelete = () => {
  if (confirm(`'${props.candidateData?.fullName}' adlı adayı silmek istediğinizden emin misiniz? Bu işlemin geri dönüşü olmayabilir.`)) {
    emit('delete', props.candidateData.id);
  }
};

watch(() => props.candidateData, (newVal) => {
  if (props.isEditMode && newVal) {
    formData.value = {
      ...newVal,
      // Gelen metinleri doğru sayılara çevir
      candidateType: candidateTypeMap[newVal.candidateType] ?? 1,
      department: departmentMap[newVal.department] ?? 1,
      gender: newVal.gender ? genderMap[newVal.gender] : null
    };
    picturePreviewUrl.value = resolveApiUrl(newVal.profilePictureUrl);
  } else {
    formData.value = getInitialFormState();
    picturePreviewUrl.value = null;
  }
  pictureFile.value = null;
}, { immediate: true });

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    pictureFile.value = target.files[0];
    picturePreviewUrl.value = URL.createObjectURL(pictureFile.value);
  }
};

const handleFormSubmit = async () => {
  try {
    let candidateId = formData.value.id;
    if (props.isEditMode) {
      await apiClient.put(`/candidates/${formData.value.id}`, formData.value);
      toast.success("Aday başarıyla güncellendi.");
    } else {
      const response = await apiClient.post('/candidates', formData.value);
      candidateId = response.data;
      toast.success("Yeni aday başarıyla oluşturuldu.");
    }

    if (pictureFile.value) {
      const pictureFormData = new FormData();
      pictureFormData.append('profilePicture', pictureFile.value);
      await apiClient.post(`/candidates/${candidateId}/profile-picture`, pictureFormData);
      toast.success("Profil resmi güncellendi.");
    }

    emit('saved');
  } catch (err: any) {
    toast.error("İşlem sırasında bir hata oluştu.");
  }
};
</script>

<template>
  <div class="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full flex items-center justify-center z-50">
    <div class="bg-white p-8 rounded-lg shadow-xl w-full max-w-3xl">


      <div class="flex justify-between mb-5">
        <h2 class="text-xl font-bold mb-6">{{ modalTitle }}</h2>
        <button
            v-if="isEditMode"
            type="button"
            @click="handleDelete"
            class=" bg-red-600 text-white px-5 py-2 rounded hover:bg-red-700">
          Adayı Sil
        </button>
      </div>
      <form @submit.prevent="handleFormSubmit">

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="md:col-span-1 flex flex-col items-center">
            <img class="h-32 w-32 rounded-full object-cover ring-4 ring-gray-200 mb-4" :src="picturePreviewUrl || 'https://ui-avatars.com/api/?name=' + (formData.firstName || '?') + '+' + (formData.lastName || '')" alt="Profile Picture">
            <label for="picture-upload" class="cursor-pointer bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <span>Resim Değiştir</span>
              <input id="picture-upload" name="picture-upload" type="file" class="sr-only" @change="handleFileChange" accept="image/*">
            </label>
          </div>
          <div class="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label class="block font-medium">İsim*</label><input v-model="formData.firstName" type="text" class="w-full mt-1 p-2 border rounded" required></div>
            <div><label class="block font-medium">Soyisim*</label><input v-model="formData.lastName" type="text" class="w-full mt-1 p-2 border rounded" required></div>
            <div class="md:col-span-2"><label class="block font-medium">E-posta*</label><input v-model="formData.email" type="email" class="w-full mt-1 p-2 border rounded" required></div>
            <div><label class="block font-medium">Doğum Tarihi</label><input v-model="formData.birthDate" type="date" class="w-full mt-1 p-2 border rounded"></div>
            <div><label class="block font-medium">Cinsiyet</label><select v-model="formData.gender" class="w-full mt-1 p-2 border rounded bg-white"><option :value="null">Seçiniz</option><option value="1">Erkek</option><option value="2">Kadın</option></select></div>
            <div><label class="block font-medium">Initial Kodu</label><input v-model="formData.initialCode" type="text" class="w-full mt-1 p-2 border rounded"></div>
            <div><label class="block font-medium">Fleet Kodu</label><input v-model="formData.fleetCode" type="text" class="w-full mt-1 p-2 border rounded"></div>
          </div>
        </div>
        <div class="flex justify-end space-x-4 mt-8">
          <button type="button" @click="emit('close')" class="bg-gray-300 px-4 py-2 rounded">İptal</button>
          <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded">Kaydet</button>
        </div>


      </form>
    </div>
  </div>
</template>