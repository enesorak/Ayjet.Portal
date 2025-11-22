<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import apiClient from '@/api/apiClient';

const props = defineProps<{
  assignmentId: string;
}>();

const router = useRouter();
const loading = ref(true);
const testInfo = ref<any>(null);

onMounted(async () => {
  try {
    const response = await apiClient.get(`/test-assignments/${props.assignmentId}/start-info`);
    testInfo.value = response.data;
  } catch (error) {
    testInfo.value = {
      canStart: false,
      statusMessage: "An error occurred while loading the test information. The link may be invalid."
    };
  } finally {
    loading.value = false;
  }
});

const proceedToTest = () => {
  // Adayı asıl sınav sayfasına yönlendir
  router.push({ name: 'take-test', params: { assignmentId: props.assignmentId } });
};
</script>

<template>
  <div class="flex items-center justify-center min-h-screen bg-gray-100">
    <div v-if="loading" class="text-center">
      <p class="text-lg font-semibold">Loading test information...</p>
    </div>

    <div v-else-if="testInfo" class="w-full max-w-lg bg-white p-8 rounded-xl shadow-lg text-center">
      <h1 class="text-2xl font-bold text-gray-800">{{ testInfo.testTitle }}</h1>
      <p class="text-lg text-gray-600 mt-2">Candidate: {{ testInfo.candidateFullName }}</p>

      <div class="my-6 border-t pt-6">
        <div v-if="testInfo.canStart">
          <p class="text-gray-700">{{ testInfo.testDescription }}</p>
          <ul class="list-disc list-inside text-left mt-4 mx-auto max-w-xs">
            <li>Total Questions: {{ testInfo.questionCount }}</li>
            <li>Time Limit: {{ testInfo.timeLimitInMinutes }} minutes</li>
          </ul>
          <button @click="proceedToTest" class="mt-8 bg-green-600 text-white font-bold py-3 px-8 rounded-lg text-lg hover:bg-green-700">
            Start Test
          </button>
        </div>

        <div v-else>
          <p class="text-xl font-semibold p-4 rounded-md"
             :class="{ 'bg-yellow-100 text-yellow-800': testInfo.statusMessage.includes('expired'), 'bg-blue-100 text-blue-800': !testInfo.statusMessage.includes('expired') }">
            {{ testInfo.statusMessage }}
          </p>
          <p class="mt-4 text-gray-500">If you believe this is an error, please contact the administrator.</p>
        </div>
      </div>
    </div>
  </div>
</template>