<script setup lang="ts">
import { ref } from 'vue';
import apiClient from '@/api/apiClient';
import { useToast } from 'vue-toastification';

const props = defineProps<{
  assignmentId: string;
  candidateName: string;
  testTitle: string;
}>();

const emit = defineEmits(['close', 'success']);
const toast = useToast();

const newExpirationInDays = ref(3);
const isSending = ref(false);

const handleResend = async () => {
  isSending.value = true;
  try {
    const payload = {
      assignmentId: props.assignmentId,
      newExpirationInDays: newExpirationInDays.value
    };

    await apiClient.post(`/test-assignments/${props.assignmentId}/resend-invitation`, payload);
    toast.success("Davetiye e-postası başarıyla gönderildi!");
    emit('success');
  } catch (error: any) {
    const msg = error.response?.data?.title || "E-posta gönderilirken bir hata oluştu.";
    toast.error(msg);
  } finally {
    isSending.value = false;
  }
};
</script>

<template>
  <div class="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
      <h2 class="text-xl font-bold mb-4 text-gray-800">
        <i class="mdi mdi-email-send-outline mr-2 text-blue-600"></i>
        E-posta Yeniden Gönder
      </h2>

      <div class="space-y-4 mb-6">
        <div class="bg-gray-50 p-4 rounded-lg">
          <p class="text-sm text-gray-600">
            <strong class="text-gray-800">Aday:</strong> {{ candidateName }}
          </p>
          <p class="text-sm text-gray-600 mt-1">
            <strong class="text-gray-800">Test:</strong> {{ testTitle }}
          </p>
        </div>

        <div>
          <label for="expirationDays" class="block text-sm font-medium text-gray-700 mb-2">
            Yeni Geçerlilik Süresi (Gün)
          </label>
          <input
              id="expirationDays"
              v-model.number="newExpirationInDays"
              type="number"
              min="1"
              max="365"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p class="text-xs text-gray-500 mt-1">
            Test linki bu kadar gün sonra geçersiz olacaktır.
          </p>
        </div>
      </div>

      <div class="flex justify-end space-x-3">
        <button
            @click="emit('close')"
            :disabled="isSending"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          İptal
        </button>
        <button
            @click="handleResend"
            :disabled="isSending || newExpirationInDays < 1"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
        >
          <i v-if="!isSending" class="mdi mdi-email-send mr-2"></i>
          <i v-else class="mdi mdi-loading mdi-spin mr-2"></i>
          <span v-if="isSending">Gönderiliyor...</span>
          <span v-else>E-posta Gönder</span>
        </button>
      </div>
    </div>
  </div>
</template>