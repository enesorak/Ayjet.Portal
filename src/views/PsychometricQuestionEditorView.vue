<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import apiClient from '@/api/apiClient';
import { useToast } from 'vue-toastification';

const props = defineProps<{
  id: string;
}>();

const router = useRouter();
const toast = useToast();

// --- STATE ---
const loading = ref(true);
const error = ref<string | null>(null);
const questionData = ref<any>(null);
const allScales = ref<any[]>([]); // Sistemdeki tüm ölçekleri tutmak için

// Yeni kural ekleme formu için state
const newRule = ref({
  scaleId: null as number | null,
  scoringDirection: 1, // Varsayılan: Doğru (True)
  requiredGender: null as number | null
});

// --- HELPER DATA & FUNCTIONS ---
const scoringDirectionOptions = [
  { text: 'Doğru (True)', value: 1 },
  { text: 'Yanlış (False)', value: 2 }
];

const genderOptions = [
  { text: 'Tümü', value: null },
  { text: 'Erkek', value: 1 },
  { text: 'Kadın', value: 2 }
];

const getScoringDirectionText = (value: number) => {
  return scoringDirectionOptions.find(o => o.value === value)?.text || 'Bilinmiyor';
};

const getGenderText = (value: number | null) => {
  return genderOptions.find(o => o.value === value)?.text || 'Tümü';
};

// --- API METHODS ---
const fetchData = async () => {
  loading.value = true;
  try {
    const [questionRes, scalesRes] = await Promise.all([
      apiClient.get(`/questions/psychometric/${props.id}`),
      apiClient.get('/psychometric-scales')
    ]);
    questionData.value = questionRes.data;
    allScales.value = scalesRes.data;
  } catch (err) {
    error.value = "Soru detayları getirilemedi.";
    toast.error(error.value);
  } finally {
    loading.value = false;
  }
};

const saveChanges = async () => {
  try {
    await apiClient.put(`/questions/psychometric/${props.id}`, questionData.value);
    toast.success("Soru başarıyla güncellendi.");
    router.back(); // Bir önceki sayfaya dön
  } catch (error) {
    toast.error("Güncelleme sırasında bir hata oluştu.");
  }
};

// --- LOCAL ACTIONS ---
const addRule = () => {
  if (!newRule.value.scaleId) {
    toast.warning("Lütfen bir ölçek seçin.");
    return;
  }
  const scale = allScales.value.find(s => s.id === newRule.value.scaleId);
  if (!scale) return;

  questionData.value.scaleMappings.push({
    scaleId: newRule.value.scaleId,
    scaleName: scale.name,
    scoringDirection: newRule.value.scoringDirection,
    requiredGender: newRule.value.requiredGender
  });
  // Formu sıfırla
  newRule.value = { scaleId: null, scoringDirection: 1, requiredGender: null };
};

const removeRule = (index: number) => {
  questionData.value.scaleMappings.splice(index, 1);
};


onMounted(fetchData);
</script>

<template>
  <div class="container mx-auto p-6 bg-gray-50 min-h-screen">
    <div v-if="loading" class="text-center py-20 text-gray-500">Yükleniyor...</div>
    <div v-else-if="error" class="text-center py-20 text-red-500 bg-red-100 p-4 rounded">{{ error }}</div>

    <div v-else-if="questionData" class="space-y-8">
      <div class="flex justify-between items-center">
        <h1 class="text-3xl font-bold text-gray-800">Psikometrik Soru Düzenle</h1>
        <button @click="saveChanges" class="bg-green-600 text-white font-bold py-2 px-6 rounded hover:bg-green-700">
          Değişiklikleri Kaydet
        </button>
      </div>

      <div class="bg-white p-6 rounded-lg shadow-md">
        <h2 class="text-xl font-semibold mb-4 text-gray-700">Temel Bilgiler ve Çeviriler</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label class="block text-sm font-medium text-gray-600">Sıra No</label>
            <input v-model.number="questionData.displayOrder" type="number" class="mt-1 w-full px-3 py-2 border rounded" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-600">Soru Kodu</label>
            <input v-model="questionData.questionCode" type="text" class="mt-1 w-full px-3 py-2 border rounded bg-gray-100" disabled />
          </div>
          <div class="flex items-end pb-2">
            <input v-model="questionData.isActive" type="checkbox" class="h-5 w-5 rounded" id="is-active" />
            <label for="is-active" class="ml-2 text-gray-800">Soru Aktif mi?</label>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="block text-sm font-medium text-gray-700">Türkçe Metin</label>
            <textarea v-model="questionData.translations.find(t => t.language === 'tr-TR').text" rows="4" class="mt-1 w-full px-3 py-2 border rounded"></textarea>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">İngilizce Metin</label>
            <textarea v-model="questionData.translations.find(t => t.language === 'en-US').text" rows="4" class="mt-1 w-full px-3 py-2 border rounded"></textarea>
          </div>
        </div>
      </div>

      <div class="bg-white p-6 rounded-lg shadow-md">
        <h2 class="text-xl font-semibold mb-4 text-gray-700">Puanlama Kuralları</h2>
        <table class="min-w-full divide-y divide-gray-200 mb-6 text-sm">
          <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-2 text-left font-medium text-gray-600">Ölçek</th>
            <th class="px-4 py-2 text-left font-medium text-gray-600">Puanlanan Cevap</th>
            <th class="px-4 py-2 text-left font-medium text-gray-600">Cinsiyet Koşulu</th>
            <th class="w-16"></th>
          </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
          <tr v-for="(rule, index) in questionData.scaleMappings" :key="index">
            <td class="px-4 py-2 font-semibold">{{ rule.scaleName }}</td>
            <td class="px-4 py-2">{{ getScoringDirectionText(rule.scoringDirection) }}</td>
            <td class="px-4 py-2">{{ getGenderText(rule.requiredGender) }}</td>
            <td class="px-4 py-2 text-right">
              <button @click="removeRule(index)" class="text-red-500 hover:text-red-700" title="Kuralı Sil">
                <i class="mdi mdi-delete"></i>
              </button>
            </td>
          </tr>
          <tr v-if="questionData.scaleMappings.length === 0">
            <td colspan="4" class="px-4 py-4 text-center text-gray-500">Bu soru için henüz puanlama kuralı eklenmemiş.</td>
          </tr>
          </tbody>
        </table>
        <div class="flex items-end space-x-2 p-3 border-t bg-gray-50 rounded-b-lg">
          <div class="flex-1">
            <label class="block text-xs font-medium text-gray-600">Ölçek</label>
            <select v-model="newRule.scaleId" class="w-full mt-1 px-3 py-2 border rounded bg-white"><option :value="null" disabled>Seçin...</option><option v-for="s in allScales" :key="s.id" :value="s.id">{{ s.name }}</option></select>
          </div>
          <div class="flex-1">
            <label class="block text-xs font-medium text-gray-600">Puanlanan Cevap</label>
            <select v-model.number="newRule.scoringDirection" class="w-full mt-1 px-3 py-2 border rounded bg-white"><option v-for="d in scoringDirectionOptions" :key="d.value" :value="d.value">{{ d.text }}</option></select>
          </div>
          <div class="flex-1">
            <label class="block text-xs font-medium text-gray-600">Cinsiyet Koşulu</label>
            <select v-model="newRule.requiredGender" class="w-full mt-1 px-3 py-2 border rounded bg-white"><option v-for="g in genderOptions" :key="g.value" :value="g.value">{{ g.text }}</option></select>
          </div>
          <div>
            <button @click="addRule" type="button" class="bg-blue-500 text-white px-4 py-2 rounded h-full hover:bg-blue-600">Kural Ekle</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>