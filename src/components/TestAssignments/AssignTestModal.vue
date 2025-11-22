<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import apiClient from '@/api/apiClient';
import {useToast} from "vue-toastification";

const props = defineProps<{ candidateIds: string[] }>();
const emit = defineEmits(['close', 'success']);

const tests = ref<any[]>([]);
const selectedTestId = ref<string | null>(null);
const daysToExpire = ref(3);
const timeLimit = ref<number | null>(null);
const questionCount = ref<number | null>(null);
const language = ref('en-US'); // Yeni state ve varsayılan değer

watch(selectedTestId, (newId) => {
  const selectedTest = tests.value.find(t => t.id === newId);
  if (selectedTest) {
    timeLimit.value = selectedTest.defaultTimeLimitInMinutes;
    questionCount.value = selectedTest.defaultQuestionCount;
  }
});
const toast = useToast();
onMounted(async () => {
  const response = await apiClient.get('/testdefinitions?pageSize=1000');
  tests.value = response.data.items;
});

const handleAssign = async () => {
  if (!selectedTestId.value) {
    toast.error("Lütfen bir test seçin.");
    return;
  }
  try {
    // Payload'daki özelliklerin sırasını C# record'u ile aynı yapıyoruz
    const payload = {
      testDefinitionId: selectedTestId.value,
      candidateIds: props.candidateIds,
      timeLimitInMinutes: timeLimit.value,
      questionCount: questionCount.value,
      language: language.value,
      daysToExpire: daysToExpire.value
    };

    await apiClient.post('/test-assignments', payload);
    emit('success');
  } catch (error) {
    console.error("Atama sırasında hata:", error);
    toast.error("Test ataması sırasında bir hata oluştu.");
  }
};
</script>

<template>
  <div class="fixed inset-0 bg-gray-600 bg-opacity-75 h-full w-full flex items-center justify-center z-50">
    <div class="bg-white p-8 rounded-lg shadow-xl w-full max-w-lg">
      <h2 class="text-xl font-bold mb-6">Seçili {{ candidateIds.length }} Adaya Test Ata</h2>
      <form @submit.prevent="handleAssign">
        <div class="mb-4">
          <label class="block text-gray-700 font-bold mb-2">Atanacak Test</label>
          <select v-model="selectedTestId" class="w-full px-3 py-2 border rounded bg-white" required>
            <option :value="null" disabled>Bir test seçin...</option>
            <option v-for="test in tests" :key="test.id" :value="test.id">{{ test.title }}</option>
          </select>
        </div>
        <div class="mb-4">
          <label class="block text-gray-700 font-bold mb-2">Sınav Dili</label>
          <select v-model="language" class="w-full px-3 py-2 border rounded bg-white">
            <option value="tr-TR">Türkçe</option>
            <option value="en-US">English</option>

          </select>
        </div>
        <div class="grid grid-cols-2 gap-4 mb-4">
          <div><label class="block text-gray-700 font-bold mb-2">Soru Sayısı</label><input v-model.number="questionCount" type="number" min="1" class="w-full px-3 py-2 border rounded" placeholder="Testteki tüm sorular"></div>
          <div><label class="block text-gray-700 font-bold mb-2">Süre (Dakika)</label><input v-model.number="timeLimit" type="number" min="1" class="w-full px-3 py-2 border rounded" placeholder="Süresiz"></div>
        </div>
        <div class="mb-4">
          <label class="block text-gray-700 font-bold mb-2">Geçerlilik Süresi (Gün)</label>
          <input v-model.number="daysToExpire" type="number" min="1" class="w-full px-3 py-2 border rounded">
        </div>
        <div class="flex justify-end space-x-4 mt-8">
          <button type="button" @click="$emit('close')" class="bg-gray-300 px-4 py-2 rounded">İptal</button>
          <button type="submit" :disabled="!selectedTestId" class="bg-indigo-600 text-white px-4 py-2 rounded disabled:opacity-50">Ata</button>
        </div>
      </form>
    </div>
  </div>
</template>