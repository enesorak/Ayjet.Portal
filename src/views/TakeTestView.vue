<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import apiClient from '@/api/apiClient';
import { useToast } from 'vue-toastification';
import { resolveApiUrl } from '@/utils/urlHelper';
import ProfileCompletionModal from "@/components/Candidate/ProfileCompletionModal.vue";
import QuestionPalette from "@/components/Test/QuestionPalette.vue";

const props = defineProps<{
  assignmentId: string;
}>();

const router = useRouter();
const toast = useToast();

const loadingState = ref<'initial' | 'starting' | 'loaded' | 'error' | 'completed' | 'expired'>('initial');
const testProgress = ref<any>(null);
const questions = ref<any[]>([]);
const currentQuestionIndex = ref(0);
const selectedAnswers = ref<any>({});
const showProfileModal = ref(false);
const isQuickMode = ref(localStorage.getItem('quickMode') === 'false' ? false : true); // Varsayılan true

const timeLeft = ref(0);
let timerId: number;



// --- COMPUTED PROPERTIES ---
const currentQuestion = computed(() => questions.value[currentQuestionIndex.value]);
const progressPercentage = computed(() => questions.value.length > 0 ? (Object.keys(selectedAnswers.value).length / questions.value.length) * 100 : 0);
const answeredQuestionIndices = computed(() => {
  const answeredIds = new Set(Object.keys(selectedAnswers.value).map(Number));
  const indices = new Set<number>();
  questions.value.forEach((q, index) => {
    if (answeredIds.has(q.questionId)) {
      indices.add(index);
    }
  });
  return indices;
});
const computedTestTitle = computed(() => testProgress.value?.testTitle || 'Sınav Yükleniyor...');
const computedCandidateFullName = computed(() => testProgress.value?.candidate?.fullName || 'Aday');

const formattedTimeLeft = computed(() => {
  const minutes = Math.floor(timeLeft.value / 60);
  const seconds = timeLeft.value % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
});


// --- METHODS ---

const loadAndPrepareTest = async () => {
  loadingState.value = 'initial';
  try {
    const response = await apiClient.get(`/test-assignments/${props.assignmentId}/progress`);
    testProgress.value = response.data;

    // --- YENİ VE NİHAİ KONTROL MANTIĞI ---
    if (testProgress.value.status === 'Completed') {
      loadingState.value = 'completed';
      return;
    }
    if (testProgress.value.status === 'Expired') {
      loadingState.value = 'expired';
      return;
    }
    if (testProgress.value.status === 'InProgress') {
      await loadQuestionsAndContinue();
      return;
    }
    // Sadece 'Pending' ise bu adıma geçilir
    if (!testProgress.value.candidate.isProfileConfirmed) {
      showProfileModal.value = true;
    } else {
      await startTestAndLoadQuestions();
    }
  } catch (err) {
    loadingState.value = 'error';
    toast.error("Sınav bilgileri yüklenirken bir hata oluştu. Link geçersiz olabilir.");
  }
};
const startTestAndLoadQuestions = async () => {
  showProfileModal.value = false;
  loadingState.value = 'starting';
  try {
    await apiClient.post(`/test-assignments/${props.assignmentId}/start`);
    await loadQuestionsAndContinue();
  } catch (error) {
    loadingState.value = 'error';
    toast.error("Sınav başlatılırken bir hata oluştu.");
  }
};

const loadQuestionsAndContinue = async () => {
  const response = await apiClient.get(`/test-assignments/${props.assignmentId}/progress`);
  testProgress.value = response.data;
  questions.value = response.data.questions || [];

  const savedProgress = sessionStorage.getItem(`progress_${props.assignmentId}`);
  if (savedProgress) {
    selectedAnswers.value = JSON.parse(savedProgress);
  }

  // **DÜZELTME: SON AKTİF SORUYU GÖSTER**
  const lastActiveIndex = sessionStorage.getItem(`lastActiveIndex_${props.assignmentId}`);
  if (lastActiveIndex && parseInt(lastActiveIndex, 10) < questions.value.length) {
    currentQuestionIndex.value = parseInt(lastActiveIndex, 10);
  } else {
    const firstUnansweredIndex = questions.value.findIndex(q => selectedAnswers.value[q.questionId] === undefined);
    currentQuestionIndex.value = firstUnansweredIndex !== -1 ? firstUnansweredIndex : 0;
  }

  if (testProgress.value.timeLimitInMinutes > 0 && testProgress.value.startedAt) {
    startTimer(testProgress.value.timeLimitInMinutes, testProgress.value.startedAt);
  }
  loadingState.value = 'loaded';

  console.log('Timer Info:', {
    timeLimitInMinutes: testProgress.value.timeLimitInMinutes,
    startedAt: testProgress.value.startedAt,
    timeLeft: timeLeft.value
  });
};

const handleAnswerSelected = (questionId: number, response: number | null) => {
  selectedAnswers.value[questionId] = response;
  sessionStorage.setItem(`progress_${props.assignmentId}`, JSON.stringify(selectedAnswers.value));

  if (isQuickMode.value && currentQuestionIndex.value < questions.value.length - 1) {
    setTimeout(() => nextQuestion(), 200);
  }
};

const handleKeyPress = (event: KeyboardEvent) => {
  if (loadingState.value !== 'loaded' || !currentQuestion.value) return;

  if (testProgress.value.testType === 'Psychometric') {
    let response: number | null = null;
    if (event.key === '1') response = 1;
    if (event.key === '2') response = 2;
    if (event.key === '3' || event.key === '0') response = 0;

    if (response !== null) {
      handleAnswerSelected(currentQuestion.value.questionId, response);
    }
  }
};

const nextQuestion = () => {
  if (currentQuestionIndex.value < questions.value.length - 1) {
    currentQuestionIndex.value++;
  }
};

const prevQuestion = () => {
  if (currentQuestionIndex.value > 0) {
    currentQuestionIndex.value--;
  }
};

const navigateToQuestion = (index: number) => {
  currentQuestionIndex.value = index;
};

const startTimer = (timeLimitInMinutes: number, startedAt: string) => {
  if (!timeLimitInMinutes || timeLimitInMinutes <= 0) return;
  const endTime = new Date(startedAt).getTime() + timeLimitInMinutes * 60 * 1000;

  timerId = window.setInterval(() => {
    const now = new Date().getTime();
    const distance = endTime - now;
    if (distance < 0) {
      clearInterval(timerId);
      timeLeft.value = 0;
      finishTest(true);
    } else {
      timeLeft.value = Math.floor(distance / 1000);
    }
  }, 1000);
};

const finishTest = async (isAutoSubmit: boolean = false) => {
  let proceed = false;
  if (isAutoSubmit) {
    proceed = true;
    toast.warning("Süreniz doldu, sınavınız otomatik olarak gönderiliyor.", { timeout: 5000 });
  } else {
    const unansweredCount = questions.value.length - Object.keys(selectedAnswers.value).length;
    if (unansweredCount > 0) {
      proceed = confirm(`Cevaplanmamış ${unansweredCount} sorunuz var. Sınavı bitirmek istediğinizden emin misiniz?`);
    } else {
      proceed = confirm("Sınavı bitirmek istediğinizden emin misiniz? Bu işlem geri alınamaz.");
    }
  }

  if (proceed) {
    clearInterval(timerId);
    try {

        // --- DÜZELTİLMİŞ TEK API ÇAĞRISI ---
        // Backend'in beklediği FinishTestCommand nesnesini oluştur
        const finishCommand = {
          assignmentId: props.assignmentId,
          answers: selectedAnswers.value // Cevapları doğrudan komutun içine göm
        };

        // Tek bir API çağrısı ile hem cevapları gönder hem de sınavı bitir
        await apiClient.post(
            `/test-assignments/${props.assignmentId}/finish`,
            finishCommand
        );
        // ------------------------------------

        // Geçici kayıtları temizle
        sessionStorage.removeItem(`progress_${props.assignmentId}`);
        sessionStorage.removeItem(`lastActiveIndex_${props.assignmentId}`);

        // Tamamlandı sayfasına yönlendir
        router.push({ name: 'test-completed' })
    } catch (err) {
        toast.error(err.response?.data?.title || "Sınav bitirilirken bir hata oluştu.");
    }
  }
};

// --- YENİ WATCHER ---
watch(currentQuestionIndex, (newIndex) => {
  sessionStorage.setItem(`lastActiveIndex_${props.assignmentId}`, newIndex.toString());
});
watch(isQuickMode, (newValue) => {
  localStorage.setItem('quickMode', newValue.toString());
});

onMounted(() => {
  loadAndPrepareTest();

  if (!localStorage.getItem('quickMode')) {
    localStorage.setItem('quickMode', 'true');
    isQuickMode.value = true;
  }
  window.addEventListener('keydown', handleKeyPress);
});

onUnmounted(() => {
  clearInterval(timerId);
  window.removeEventListener('keydown', handleKeyPress);
});
</script>

<template>
  <div class="flex flex-col min-h-screen bg-gray-100 font-sans">

    <div v-if="loadingState === 'initial'" class="flex-grow flex items-center justify-center"><p>Sınav bilgileri yükleniyor...</p></div>
    <div v-else-if="loadingState === 'starting'" class="flex-grow flex items-center justify-center"><p>Sınavınız başlatılıyor, lütfen bekleyin...</p></div>
    <div v-else-if="loadingState === 'error'" class="flex-grow flex items-center justify-center text-red-500"><p>Sınav yüklenemedi.</p></div>
    <div v-else-if="loadingState === 'completed'" class="flex-grow flex items-center justify-center">
      <div class="w-full max-w-lg bg-white p-8 rounded-xl shadow-lg text-center">
        <h1 class="text-2xl font-bold text-blue-600">Sınav Tamamlandı</h1>
        <p class="mt-4 text-gray-600">Bu sınav daha önce tamamlanmıştır. Tekrar girmenize gerek yoktur.</p>
      </div>
    </div>
    <div v-else-if="loadingState === 'expired'" class="flex-grow flex items-center justify-center">
      <div class="w-full max-w-lg bg-white p-8 rounded-xl shadow-lg text-center">
        <h1 class="text-2xl font-bold text-yellow-600">Sınav Süresi Doldu</h1>
        <p class="mt-4 text-gray-600">Bu sınavın son tamamlama tarihi geçmiştir.</p>
      </div>
    </div>
    <template v-if="loadingState === 'loaded' && testProgress">
      <header class="bg-white shadow-md w-full sticky top-0 z-10">
        <div class="container mx-auto px-4 py-3">
          <!-- Mobil: Dikey düzen -->
          <div class="flex flex-col gap-3 lg:hidden">
            <!-- Üst satır: Profil ve Timer -->
            <div class="flex justify-between items-center">
              <div class="flex items-center gap-2">
                <img class="h-10 w-10 rounded-full object-cover" :src="resolveApiUrl(testProgress.candidate.profilePictureUrl) || `https://ui-avatars.com/api/?name=${computedCandidateFullName.replace(' ', '+')}`" :alt="computedCandidateFullName">
                <div class="min-w-0">
                  <span class="text-sm text-gray-700 font-semibold block truncate">{{ computedCandidateFullName }}</span>
                  <h1 class="text-base font-bold text-gray-800 truncate" :title="computedTestTitle">{{ computedTestTitle }}</h1>
                </div>
              </div>
              <div v-if="testProgress.timeLimitInMinutes && testProgress.timeLimitInMinutes > 0"
                   class="text-lg font-bold p-2 rounded text-center font-mono flex-shrink-0"
                   :class="{'text-red-600 animate-pulse': timeLeft < 300, 'text-gray-700': timeLeft >= 300}">
                <i class="mdi mdi-clock-outline align-middle"></i>
                <span class="align-middle ml-1">{{ formattedTimeLeft }}</span>
              </div>
            </div>

            <!-- Alt satır: Hızlı Cevap ve Bitir Butonu -->
            <div class="flex justify-between items-center">
              <label for="quick-mode" class="flex items-center cursor-pointer">
                <span class="mr-2 text-xs font-medium text-gray-700">Hızlı Cevap</span>
                <div class="relative">
                  <input type="checkbox" id="quick-mode" class="sr-only" v-model="isQuickMode">
                  <div class="block w-10 h-5 rounded-full transition-colors" :class="isQuickMode ? 'bg-blue-500' : 'bg-gray-200'"></div>
                  <div class="dot absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform" :class="isQuickMode ? 'translate-x-5' : 'translate-x-0'"></div>
                </div>
              </label>
              <button @click="finishTest(false)" class="bg-red-600 text-white font-bold py-2 px-4 text-sm rounded-lg hover:bg-red-700">Sınavı Bitir</button>
            </div>
          </div>

          <!-- Desktop: Yatay düzen -->
          <div class="hidden lg:flex justify-between items-center gap-6">
            <div class="flex items-center gap-4 flex-shrink-0">
              <img class="h-12 w-12 rounded-full object-cover" :src="resolveApiUrl(testProgress.candidate.profilePictureUrl) || `https://ui-avatars.com/api/?name=${computedCandidateFullName.replace(' ', '+')}`" :alt="computedCandidateFullName">
              <div>
                <span class="text-lg text-gray-700 font-semibold">{{ computedCandidateFullName }}</span>
                <h1 class="text-2xl font-bold text-gray-800 truncate" :title="computedTestTitle">{{ computedTestTitle }}</h1>
              </div>
            </div>
            <div class="flex flex-col items-center">
              <div v-if="testProgress.timeLimitInMinutes && testProgress.timeLimitInMinutes > 0"
                   class="text-2xl font-bold p-2 rounded min-w-[8rem] text-center font-mono"
                   :class="{'text-red-600 animate-pulse': timeLeft < 300, 'text-gray-700': timeLeft >= 300}">
                <i class="mdi mdi-clock-outline align-middle"></i>
                <span class="align-middle ml-1">{{ formattedTimeLeft }}</span>
              </div>

              <label for="quick-mode-desktop" class="flex items-center cursor-pointer mt-1">
                <span class="mr-3 text-sm font-medium text-gray-700">Hızlı Cevap</span>
                <div class="relative">
                  <input type="checkbox" id="quick-mode-desktop" class="sr-only" v-model="isQuickMode">
                  <div class="block w-12 h-6 rounded-full transition-colors" :class="isQuickMode ? 'bg-blue-500' : 'bg-gray-200'"></div>
                  <div class="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform" :class="isQuickMode ? 'translate-x-6' : 'translate-x-0'"></div>
                </div>
              </label>
            </div>
            <div class="flex-shrink-0">
              <button @click="finishTest(false)" class="bg-red-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-red-700">Sınavı Bitir</button>
            </div>
          </div>

          <div class="w-full bg-gray-200 rounded-full h-2.5 mt-3">
            <div class="bg-indigo-600 h-2.5 rounded-full" :style="{ width: progressPercentage + '%' }"></div>
          </div>
        </div>
      </header>

      <main class="flex-grow w-full flex justify-center items-center p-4">
        <div v-if="currentQuestion" class="w-full max-w-4xl">
          <div class="bg-white p-8 rounded-lg shadow-lg">
            <h3 class="text-xl font-semibold text-gray-800 mb-6">{{ currentQuestionIndex + 1 }}. {{ currentQuestion.questionText }}</h3>
            <div v-if="testProgress.testType === 'Psychometric'" class="flex justify-center space-x-4">
              <button @click="handleAnswerSelected(currentQuestion.questionId, 1)" :class="[selectedAnswers[currentQuestion.questionId] === 1 ? 'bg-green-600 text-white' : 'bg-gray-200 hover:bg-gray-300']" class="px-8 py-3 rounded-lg font-semibold">Doğru (1)</button>
              <button @click="handleAnswerSelected(currentQuestion.questionId, 2)" :class="[selectedAnswers[currentQuestion.questionId] === 2 ? 'bg-red-600 text-white' : 'bg-gray-200 hover:bg-gray-300']" class="px-8 py-3 rounded-lg font-semibold">Yanlış (2)</button>
              <button @click="handleAnswerSelected(currentQuestion.questionId, 0)" :class="[selectedAnswers[currentQuestion.questionId] === 0 ? 'bg-yellow-500 text-white' : 'bg-gray-200 hover:bg-gray-300']" class="px-8 py-3 rounded-lg font-semibold">Fikrim Yok (3)</button>
            </div>
            <div v-else class="space-y-4">
              <div v-for="option in currentQuestion.options" :key="option.id" @click="handleAnswerSelected(currentQuestion.questionId, option.id)"
                   :class="[selectedAnswers[currentQuestion.questionId] === option.id ? 'bg-indigo-100 border-indigo-500' : 'bg-white hover:bg-gray-50']"
                   class="flex items-center p-4 border rounded-lg cursor-pointer">
                <span class="text-gray-700">{{ option.text }}</span>
              </div>
            </div>
          </div>

          <div class="flex justify-between items-center mt-8">
            <button @click="prevQuestion" :disabled="currentQuestionIndex === 0" class="px-8 py-3 bg-white border rounded-md disabled:opacity-50">Önceki Soru</button>
            <button @click="nextQuestion" :disabled="currentQuestionIndex >= questions.length - 1" class="px-8 py-3 bg-indigo-600 text-white rounded-md disabled:opacity-50">Sonraki Soru</button>
          </div>

          <QuestionPalette
              class="mt-6"
              :total-questions="questions.length"
              :current-index="currentQuestionIndex"
              :answered-indices="answeredQuestionIndices"
              @navigate="navigateToQuestion"
          />
        </div>
      </main>
    </template>

    <ProfileCompletionModal
        v-if="showProfileModal"
        :candidate-id="testProgress?.candidate.id"
        @close="router.push('/')"
        @profile-updated="startTestAndLoadQuestions"
    />
  </div>
</template>

<style>
#quick-mode:checked + div .dot {
  transform: translateX(100%);
  background-color: #4f46e5;
}
</style>