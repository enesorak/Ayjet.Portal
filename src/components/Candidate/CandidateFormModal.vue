<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import apiClient from '@/api/apiClient';
import { useToast } from 'vue-toastification';
import { resolveApiUrl } from '@/utils/urlHelper';

const props = defineProps<{
  isEditMode: boolean;
  candidateData: any | null;
}>();

const emit = defineEmits<{
  close: []
  saved: []
  delete: [id: string]
}>();

const toast = useToast();

const getInitialFormState = () => ({
  id: '',
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
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

const educationLevelOptions = [
  'İlkokul', 'Ortaokul', 'Lise', 'Ön Lisans', 'Lisans', 'Yüksek Lisans', 'Doktora'
];

const maritalStatusOptions = [
  'Bekar', 'Evli', 'Boşanmış', 'Dul'
];

const candidateTypeMap: { [key: string]: number } = { 'Student': 0, 'Employee': 1 };
const departmentMap: { [key: string]: number } = {
  'HumanResources': 0,
  'FlightOps': 1,
  'CabinServices': 2,
  'Maintenance': 3,
  'GroundOps': 4
};
const genderMap: { [key: string]: number } = { 'Male': 1, 'Female': 2 };

// ← YENİ: Telefon numarası formatlama fonksiyonu
const formatPhoneNumber = (phone: string): string => {
  if (!phone) return '';

  // Sadece rakamları al
  const digits = phone.replace(/\D/g, '');

  // Boşsa boş döndür
  if (digits.length === 0) return '';

  // Türkiye için formatla
  if (digits.startsWith('90')) {
    // Zaten +90 ile başlıyorsa
    return '+' + digits;
  } else if (digits.startsWith('0')) {
    // 0 ile başlıyorsa (0555...) -> +90555...
    return '+90' + digits.substring(1);
  } else if (digits.length === 10) {
    // 10 haneli rakam (5553332211) -> +905553332211
    return '+90' + digits;
  } else if (digits.length > 10) {
    // Başka bir ülke kodu varsa olduğu gibi + ekle
    return '+' + digits;
  }

  // Eksik girilmişse olduğu gibi bırak (kullanıcı yazmaya devam edebilir)
  return '+90' + digits;
};

// ← YENİ: Telefon input değiştiğinde formatla
const handlePhoneInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const cursorPosition = target.selectionStart || 0;
  const oldValue = formData.value.phoneNumber;
  const newValue = target.value;

  // Format uygula
  formData.value.phoneNumber = formatPhoneNumber(newValue);

  // Cursor pozisyonunu koru (UX iyileştirmesi)
  setTimeout(() => {
    if (formData.value.phoneNumber.length >= cursorPosition) {
      target.setSelectionRange(cursorPosition, cursorPosition);
    }
  }, 0);
};

const handleDelete = () => {
  if (confirm(`'${props.candidateData?.fullName}' adlı adayı silmek istediğinizden emin misiniz? Bu işlemin geri dönüşü olmayabilir.`)) {
    emit('delete', props.candidateData.id);
  }
};

watch(() => props.candidateData, (newVal) => {
  if (props.isEditMode && newVal) {
    formData.value = {
      ...newVal,
      candidateType: candidateTypeMap[newVal.candidateType] ?? 1,
      department: departmentMap[newVal.department] ?? 1,
      gender: newVal.gender ? genderMap[newVal.gender] : null,
      phoneNumber: formatPhoneNumber(newVal.phoneNumber || ''), // ← YENİ: Telefonu formatla
      maritalStatus: newVal.maritalStatus || '',
      profession: newVal.profession || '',
      educationLevel: newVal.educationLevel || ''
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

    // ← YENİ: Submit öncesi telefonu son kez formatla
    if (formData.value.phoneNumber) {
      formData.value.phoneNumber = formatPhoneNumber(formData.value.phoneNumber);
    }

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
    <div class="bg-white p-8 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between mb-5">
        <h2 class="text-xl font-bold">{{ modalTitle }}</h2>
        <button
            v-if="isEditMode"
            type="button"
            @click="handleDelete"
            class="bg-red-600 text-white px-5 py-2 rounded hover:bg-red-700"
        >
          Adayı Sil
        </button>
      </div>

      <form @submit.prevent="handleFormSubmit">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- Sol: Profil Fotoğrafı -->
          <div class="md:col-span-1 flex flex-col items-center">
            <img
                class="h-32 w-32 rounded-full object-cover ring-4 ring-gray-200 mb-4"
                :src="picturePreviewUrl || `https://ui-avatars.com/api/?name=${formData.firstName || '?'}+${formData.lastName || ''}`"
                alt="Profile Picture"
            >
            <label for="picture-upload" class="cursor-pointer bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <span>Resim Değiştir</span>
              <input id="picture-upload" name="picture-upload" type="file" class="sr-only" @change="handleFileChange" accept="image/*">
            </label>
          </div>

          <!-- Sağ: Form Alanları -->
          <div class="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Temel Bilgiler -->
            <div>
              <label class="block font-medium text-gray-700 mb-1">İsim *</label>
              <input v-model="formData.firstName" type="text" class="w-full p-2 border rounded" required>
            </div>
            <div>
              <label class="block font-medium text-gray-700 mb-1">Soyisim *</label>
              <input v-model="formData.lastName" type="text" class="w-full p-2 border rounded" required>
            </div>

            <div class="md:col-span-2">
              <label class="block font-medium text-gray-700 mb-1">E-posta *</label>
              <input v-model="formData.email" type="email" class="w-full p-2 border rounded" required>
            </div>

            <!-- Telefon (GÜNCELLENMIŞ) -->
            <div class="md:col-span-2">
              <label class="block font-medium text-gray-700 mb-1">Telefon</label>
              <input
                  v-model="formData.phoneNumber"
                  @input="handlePhoneInput"
                  type="tel"
                  class="w-full p-2 border rounded"
                  placeholder="+90 555 333 22 11"
              >
              <p class="text-xs text-gray-500 mt-1">
                Örnek: 555 333 22 11 (otomatik olarak +90 eklenecek)
              </p>
            </div>

            <div>
              <label class="block font-medium text-gray-700 mb-1">Doğum Tarihi</label>
              <input v-model="formData.birthDate" type="date" class="w-full p-2 border rounded">
            </div>

            <div>
              <label class="block font-medium text-gray-700 mb-1">Cinsiyet</label>
              <select v-model="formData.gender" class="w-full p-2 border rounded bg-white">
                <option :value="null">Seçiniz</option>
                <option :value="1">Erkek</option>
                <option :value="2">Kadın</option>
              </select>
            </div>

            <div>
              <label class="block font-medium text-gray-700 mb-1">Initial Kodu</label>
              <input v-model="formData.initialCode" type="text" class="w-full p-2 border rounded">
            </div>

            <div>
              <label class="block font-medium text-gray-700 mb-1">Fleet Kodu</label>
              <input v-model="formData.fleetCode" type="text" class="w-full p-2 border rounded">
            </div>

            <div>
              <label class="block font-medium text-gray-700 mb-1">Medeni Hal</label>
              <select v-model="formData.maritalStatus" class="w-full p-2 border rounded bg-white">
                <option value="">Seçiniz</option>
                <option v-for="status in maritalStatusOptions" :key="status" :value="status">
                  {{ status }}
                </option>
              </select>
            </div>

            <div>
              <label class="block font-medium text-gray-700 mb-1">Eğitim Durumu</label>
              <select v-model="formData.educationLevel" class="w-full p-2 border rounded bg-white">
                <option value="">Seçiniz</option>
                <option v-for="level in educationLevelOptions" :key="level" :value="level">
                  {{ level }}
                </option>
              </select>
            </div>

            <div class="md:col-span-2">
              <label class="block font-medium text-gray-700 mb-1">Meslek</label>
              <input v-model="formData.profession" type="text" class="w-full p-2 border rounded" placeholder="Örn: Pilot, Mühendis">
            </div>
          </div>
        </div>

        <div class="flex justify-end space-x-4 mt-8">
          <button type="button" @click="emit('close')" class="bg-gray-300 px-6 py-2 rounded hover:bg-gray-400">
            İptal
          </button>
          <button type="submit" class="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700">
            Kaydet
          </button>
        </div>
      </form>
    </div>
  </div>
</template>