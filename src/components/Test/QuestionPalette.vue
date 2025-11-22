<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
  totalQuestions: number;
  currentIndex: number;
  answeredIndices: Set<number>; // Cevaplanmış SORU SIRALARINI (index) alıyoruz
}>();

const emit = defineEmits(['navigate']);

const showUnansweredOnly = ref(false);
const goToNumberInput = ref<number | null>(null);

// 1'den toplam soru sayısına kadar bir dizi oluşturuyoruz.
const allQuestionIndices = computed(() =>
    Array.from({ length: props.totalQuestions }, (_, i) => i)
);

// "Sadece Cevaplanmamışları Göster" filtresini uyguluyoruz.
const filteredQuestionIndices = computed(() => {
  if (!showUnansweredOnly.value) {
    return allQuestionIndices.value;
  }
  return allQuestionIndices.value.filter(index => !props.answeredIndices.has(index));
});

// --- KAYBETTİĞİMİZ "KAYAN PENCERE" MANTIĞI ---
const visibleQuestionIndices = computed(() => {
  const windowSize = 40; // Ekranda bir seferde gösterilecek toplam kutucuk sayısı
  const list = filteredQuestionIndices.value;
  const totalInList = list.length;

  if (totalInList <= windowSize) {
    return list; // Eğer filtrelenmiş liste pencereden azsa, hepsini göster.
  }

  // Mevcut sorunun filtrelenmiş listedeki yerini bul.
  const currentIndexInFilteredList = list.indexOf(props.currentIndex);

  // Eğer mevcut soru filtrelenmiş listede yoksa (yani cevaplanmışsa ve filtre aktifse),
  // o zaman sadece listenin başını göster.
  if (currentIndexInFilteredList === -1) {
    return list.slice(0, windowSize);
  }

  let start = currentIndexInFilteredList - Math.floor(windowSize / 2);
  start = Math.max(0, start); // Başlangıcın 0'dan küçük olmasını engelle.
  start = Math.min(start, totalInList - windowSize); // Sonun, toplam sayıyı aşmasını engelle.

  return list.slice(start, start + windowSize);
});
// ---------------------------------------------

const handleGoToQuestion = () => {
  if (goToNumberInput.value && goToNumberInput.value > 0 && goToNumberInput.value <= props.totalQuestions) {
    emit('navigate', goToNumberInput.value - 1);
    goToNumberInput.value = null;
  }
};

const getStatusClass = (index: number) => {
  if (index === props.currentIndex) {
    return 'bg-indigo-600 text-white border-indigo-700';
  }
  if (props.answeredIndices.has(index)) {
    return 'bg-green-500 text-white border-green-600';
  }
  return 'bg-white hover:bg-gray-100 border-gray-300';
};
</script>

<template>
  <div class="bg-white rounded-lg shadow-md p-5 mt-6">
    <div class="flex justify-between items-center mb-4">
      <div class="flex items-center">
        <input id="show-unanswered" type="checkbox" v-model="showUnansweredOnly" class="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500" />
        <label for="show-unanswered" class="ml-2 text-sm font-medium text-gray-700">Sadece Cevaplanmamışları Göster</label>
      </div>

      <div class="flex items-center">
        <input v-model.number="goToNumberInput" @keyup.enter="handleGoToQuestion" type="number" placeholder="Soruya Git..." class="w-24 px-2 py-1 border rounded-l-md text-sm" />
        <button @click="handleGoToQuestion" class="bg-gray-200 px-3 py-1 border-y border-r rounded-r-md text-sm font-semibold hover:bg-gray-300">Git</button>
      </div>
    </div>

    <div class="flex flex-wrap gap-2">
      <button
          v-for="index in visibleQuestionIndices"
          :key="index"
          @click="emit('navigate', index)"
          class="w-9 h-9 flex items-center justify-center text-xs font-bold transition-colors border rounded-md"
          :class="getStatusClass(index)"
      >
        {{ index + 1 }}
      </button>
    </div>
  </div>
</template>