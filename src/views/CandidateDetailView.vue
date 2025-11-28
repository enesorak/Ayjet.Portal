<script setup lang="ts">
import { ref, onMounted } from 'vue';
import apiClient from '@/api/apiClient';
import { useToast } from 'vue-toastification';
import { resolveApiUrl } from '@/utils/urlHelper';
import { format } from 'date-fns';
import { RouterLink, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/authStore.ts";

import AssignTestModal from "@/components/TestAssignments/AssignTestModal.vue";
import ImportMmpiModal from "@/components/Candidate/ImportMmpiModal.vue";
import ResendInvitationModal from "@/components/TestAssignments/ResendInvitationModal.vue";
import CandidateFormModal from "@/components/Candidate/CandidateFormModal.vue";

const props = defineProps<{
  candidateId: string;
}>();

const toast = useToast();
const authStore = useAuthStore();
const router = useRouter();

const loading = ref(true);
const candidate = ref<any>(null);
const assignments = ref<any[]>([]);

// Modal states
const showAssignModal = ref(false);
const showImportModal = ref(false);
const showResendModal = ref(false);
const showEditModal = ref(false);

// Dropdown state
const openDropdownId = ref<string | null>(null);

// Resend modal için gerekli bilgiler
const selectedAssignment = ref<any>(null);

const fetchCandidateData = async () => {
  try {
    const candidatePromise = apiClient.get(`/candidates/${props.candidateId}`);
    const assignmentsPromise = apiClient.get(`/candidates/${props.candidateId}/assignments`);

    const [candidateResponse, assignmentsResponse] = await Promise.all([
      candidatePromise,
      assignmentsPromise,
    ]);

    candidate.value = candidateResponse.data;
    assignments.value = assignmentsResponse.data;
  } catch (error) {
    toast.error("Aday bilgileri getirilirken bir hata oluştu.");
  } finally {
    loading.value = false;
  }
};

const handleMmpiImported = () => {
  showImportModal.value = false;
  toast.info("İçe aktarma tamamlandı. Puanlama arka planda devam ediyor, liste güncelleniyor...");
  fetchCandidateData();
};

const handleTestAssigned = () => {
  showAssignModal.value = false;
  toast.success("Sınav başarıyla atandı.");
  fetchCandidateData();
};

const handleResendSuccess = () => {
  showResendModal.value = false;
  toast.success("Davetiye başarıyla yeniden gönderildi.");
  fetchCandidateData();
};

const handleProfileUpdated = () => {
  showEditModal.value = false;
  toast.success("Profil başarıyla güncellendi.");
  fetchCandidateData();
};

const handleDeleteCandidate = async (candidateId: string) => {
  try {
    await apiClient.delete(`/candidates/${candidateId}`);
    toast.success("Aday başarıyla silindi.");
    router.push('/candidates');
  } catch (error: any) {
    const msg = error.response?.data?.title || "Silme işlemi sırasında bir hata oluştu.";
    toast.error(msg);
  }
};

const toggleDropdown = (assignmentId: string) => {
  openDropdownId.value = openDropdownId.value === assignmentId ? null : assignmentId;
};

const closeDropdown = () => {
  openDropdownId.value = null;
};

const openResendModal = (assignment: any) => {
  selectedAssignment.value = assignment;
  showResendModal.value = true;
  closeDropdown();
};

const copyTestLink = (assignmentId: string) => {
  const link = `${window.location.origin}/take-test/${assignmentId}`;
  navigator.clipboard.writeText(link);
  toast.success("Test linki kopyalandı!");
  closeDropdown();
};

const shareViaWhatsApp = (assignmentId: string, testTitle: string) => {
  const link = `${window.location.origin}/take-test/${assignmentId}`;
  const message = encodeURIComponent(`Merhaba! "${testTitle}" sınavını tamamlamanız bekleniyor.\n\nSınav Linki: ${link}`);

  let whatsappUrl = '';

  if (candidate.value?.phoneNumber) {
    const cleanPhone = candidate.value.phoneNumber.replace(/\D/g, '');
    whatsappUrl = `https://wa.me/${cleanPhone}?text=${message}`;
  } else {
    toast.info("Adayın telefon numarası kayıtlı değil. WhatsApp uygulaması açılacak, numarayı manuel girmeniz gerekecek.");
    whatsappUrl = `https://wa.me/?text=${message}`;
  }

  window.open(whatsappUrl, '_blank');
  closeDropdown();
};

const handleCancelAssignment = async (assignmentId: string, testTitle: string) => {
  closeDropdown();

  if (!confirm(`"${testTitle}" sınavını iptal etmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) {
    return;
  }

  try {
    await apiClient.post(`/test-assignments/${assignmentId}/cancel`);
    toast.success("Sınav başarıyla iptal edildi.");
    fetchCandidateData();
  } catch (error: any) {
    const msg = error.response?.data?.title || "İptal işlemi sırasında bir hata oluştu.";
    toast.error(msg);
  }
};

const handleDeleteAssignment = async (assignmentId: string, testTitle: string) => {
  closeDropdown();

  if (!confirm(`"${testTitle}" sınavını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) {
    return;
  }

  try {
    await apiClient.delete(`/test-assignments/${assignmentId}`);
    toast.success("Sınav başarıyla silindi.");
    fetchCandidateData();
  } catch (error: any) {
    const msg = error.response?.data?.title || "Silme işlemi sırasında bir hata oluştu.";
    toast.error(msg);
  }
};

const handleInvalidateTest = async (assignmentId: string, testTitle: string) => {
  closeDropdown();

  const reason = prompt(`"${testTitle}" sınavını neden geçersiz sayıyorsunuz? (İsteğe bağlı)`);
  if (reason === null) return;

  try {
    await apiClient.post(`/test-assignments/${assignmentId}/invalidate`, {
      assignmentId: assignmentId,  // ← EKLENMELİ
      reason: reason || "Belirtilmedi"
    });
    toast.success("Sınav geçersiz olarak işaretlendi.");
    fetchCandidateData();
  } catch (error: any) {
    const msg = error.response?.data?.title || "İşlem sırasında bir hata oluştu.";
    toast.error(msg);
  }
};

// CSV Export
const exportAnswersToCSV = async (assignmentId: string, candidateName: string) => {
  closeDropdown();

  const toastId = toast.info("CSV dosyası hazırlanıyor...", { timeout: false });

  try {
    const response = await apiClient.get(`/test-results/${assignmentId}/answer-analysis`);
    const answers = response.data;

    if (!answers || answers.length === 0) {
      toast.dismiss(toastId);
      toast.warning("İndirilecek cevap bulunamadı.");
      return;
    }

    let csvContent = "soru,cevap\n";

    answers.forEach((answer: any, index: number) => {
      const questionNumber = index + 1;
      let answerValue = '';

      if (answer.yourAnswer === 'Doğru' || answer.yourAnswer === 'True') {
        answerValue = '1';
      } else if (answer.yourAnswer === 'Yanlış' || answer.yourAnswer === 'False') {
        answerValue = '2';
      } else if (answer.yourAnswer === 'Fikrim Yok' || answer.yourAnswer === 'No Idea') {
        answerValue = '0';
      } else if (answer.yourAnswer === 'Cevaplanmamış') {
        answerValue = '0';
      } else {
        answerValue = answer.yourAnswer !== 'Cevaplanmamış' ? '1' : '0';
      }

      csvContent += `${questionNumber},${answerValue}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `MMPI_Cevaplar_${candidateName}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast.dismiss(toastId);
    toast.success("CSV dosyası başarıyla indirildi.");
  } catch (error: any) {
    toast.dismiss(toastId);
    console.error("CSV export error:", error);
    const msg = error.response?.data?.title || "CSV dosyası oluşturulurken bir hata oluştu.";
    toast.error(msg);
  }
};

// Dropdown dışına tıklanınca kapat
onMounted(() => {
  fetchCandidateData();

  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.dropdown-container')) {
      closeDropdown();
    }
  });
});
</script>

<template>
  <div class="container mx-auto p-6">
    <div v-if="loading" class="text-center py-10">Yükleniyor...</div>

    <div v-else-if="candidate" class="space-y-6">
      <!-- Profil Kartı -->
      <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200 relative">
        <button
            @click="showEditModal = true"
            class="absolute top-4 right-4 text-gray-400 hover:text-indigo-600 transition-colors"
            title="Profili Düzenle"
        >
          <i class="mdi mdi-pencil-outline text-xl"></i>
        </button>

        <div class="flex items-start space-x-6">
          <img
              class="h-24 w-24 rounded-full object-cover ring-2 ring-gray-100"
              :src="resolveApiUrl(candidate.profilePictureUrl) || `https://ui-avatars.com/api/?name=${candidate.fullName.replace(' ', '+')}`"
              :alt="candidate.fullName"
          >
          <div class="flex-grow">
            <h1 class="text-2xl font-semibold text-gray-900">{{ candidate.fullName }}</h1>
            <p class="text-sm text-gray-500 mt-1">{{ candidate.email }}</p>

            <div class="mt-4 grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-2 text-sm">
              <div v-if="candidate.age">
                <span class="text-gray-500">Yaş:</span>
                <span class="ml-2 text-gray-900 font-medium">{{ candidate.age }}</span>
              </div>
              <div v-if="candidate.gender">
                <span class="text-gray-500">Cinsiyet:</span>
                <span class="ml-2 text-gray-900 font-medium">{{ candidate.gender }}</span>
              </div>
              <div v-if="candidate.maritalStatus">
                <span class="text-gray-500">Medeni Hal:</span>
                <span class="ml-2 text-gray-900 font-medium">{{ candidate.maritalStatus }}</span>
              </div>
              <div v-if="candidate.educationLevel">
                <span class="text-gray-500">Eğitim:</span>
                <span class="ml-2 text-gray-900 font-medium">{{ candidate.educationLevel }}</span>
              </div>
              <div v-if="candidate.profession">
                <span class="text-gray-500">Meslek:</span>
                <span class="ml-2 text-gray-900 font-medium">{{ candidate.profession }}</span>
              </div>
              <div>
                <span class="text-gray-500">Profil Onayı:</span>
                <span :class="candidate.isProfileConfirmed ? 'text-green-600' : 'text-amber-600'" class="ml-2 font-medium">
                  {{ candidate.isProfileConfirmed ? 'Onaylı' : 'Bekliyor' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Aksiyon Butonları -->
      <div class="flex items-center gap-3">
        <button
            @click="showAssignModal = true"
            class="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <i class="mdi mdi-clipboard-plus-outline mr-2"></i>
          Yeni Sınav Ata
        </button>

        <button
            @click="showImportModal = true"
            class="inline-flex items-center px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-md hover:bg-teal-700 transition-colors shadow-sm"
        >
          <i class="mdi mdi-file-upload-outline mr-2"></i>
          MMPI İçe Aktar
        </button>
      </div>

      <!-- Atanan Sınavlar Tablosu -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200">
        <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-lg font-semibold text-gray-900">Atanan Sınavlar</h2>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sınav Adı</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Atanma</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Son Tarih</th>
              <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
            </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
            <tr v-if="assignments.length === 0">
              <td colspan="5" class="px-6 py-8 text-center text-sm text-gray-500">
                Bu adaya henüz sınav atanmamış.
              </td>
            </tr>
            <tr v-else v-for="assignment in assignments" :key="assignment.assignmentId" class="hover:bg-gray-50 transition-colors">
              <td class="px-6 py-4">
                <div class="text-sm font-medium text-gray-900">{{ assignment.testTitle }}</div>
              </td>
              <td class="px-6 py-4">
                <span
                    :class="{
                      'bg-yellow-50 text-yellow-700 border-yellow-200': assignment.status === 'Pending',
                      'bg-blue-50 text-blue-700 border-blue-200': assignment.status === 'InProgress',
                      'bg-green-50 text-green-700 border-green-200': assignment.status === 'Completed',
                      'bg-red-50 text-red-700 border-red-200': assignment.status === 'Expired',
                      'bg-gray-50 text-gray-700 border-gray-200': assignment.status === 'Invalidated'
                    }"
                    class="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border"
                >
                  {{ assignment.status }}
                </span>
              </td>
              <td class="px-6 py-4 text-sm text-gray-500">
                {{ assignment.createdAt ? format(new Date(assignment.createdAt), 'dd/MM/yyyy HH:mm') : '-' }}
              </td>
              <td class="px-6 py-4 text-sm text-gray-500">
                {{ assignment.expiresAt ? format(new Date(assignment.expiresAt), 'dd/MM/yyyy HH:mm') : '-' }}
              </td>
              <td class="px-6 py-4 text-center">
                <div class="flex items-center justify-center gap-2">
                  <!-- Completed: Raporu Gör -->
                  <RouterLink
                      v-if="assignment.status === 'Completed'"
                      :to="{ name: 'test-results', params: { assignmentId: assignment.assignmentId } }"
                      class="text-indigo-600 hover:text-indigo-900 transition-colors"
                      title="Raporu Görüntüle"
                  >
                    <i class="mdi mdi-file-document-outline text-lg"></i>
                  </RouterLink>

                  <!-- Dropdown Menu (Diğer durumlar için) -->
                  <div v-if="assignment.status !== 'Expired'" class="relative dropdown-container">
                    <button
                        @click.stop="toggleDropdown(assignment.assignmentId)"
                        class="text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                        title="İşlemler"
                    >
                      <i class="mdi mdi-dots-vertical text-lg"></i>
                    </button>

                    <!-- Dropdown Menu -->
                    <div
                        v-if="openDropdownId === assignment.assignmentId"
                        class="absolute right-0 mt-2 w-52 bg-white rounded-lg shadow-lg z-10 border border-gray-200"
                    >
                      <div class="py-1">
                        <!-- Completed için özel menü -->
                        <template v-if="assignment.status === 'Completed'">
                          <button
                              @click="exportAnswersToCSV(assignment.assignmentId, candidate.fullName)"
                              class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center transition-colors"
                          >
                            <i class="mdi mdi-file-delimited mr-3 text-gray-400"></i>
                            Cevapları İndir (CSV)
                          </button>

                          <div class="border-t border-gray-100 my-1"></div>

                          <button
                              @click="handleInvalidateTest(assignment.assignmentId, assignment.testTitle)"
                              class="w-full text-left px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 flex items-center transition-colors"
                          >
                            <i class="mdi mdi-alert-circle-outline mr-3"></i>
                            Geçersiz İşaretle
                          </button>
                        </template>

                        <!-- Pending/InProgress için menü -->
                        <template v-if="assignment.status === 'Pending' || assignment.status === 'InProgress'">
                          <button
                              @click="openResendModal(assignment)"
                              class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center transition-colors"
                          >
                            <i class="mdi mdi-email-outline mr-3 text-gray-400"></i>
                            E-posta Gönder
                          </button>

                          <button
                              @click="shareViaWhatsApp(assignment.assignmentId, assignment.testTitle)"
                              class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center transition-colors"
                          >
                            <i class="mdi mdi-whatsapp mr-3 text-gray-400"></i>
                            WhatsApp Paylaş
                          </button>

                          <button
                              @click="copyTestLink(assignment.assignmentId)"
                              class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center transition-colors"
                          >
                            <i class="mdi mdi-content-copy mr-3 text-gray-400"></i>
                            Linki Kopyala
                          </button>

                          <div class="border-t border-gray-100 my-1"></div>

                          <button
                              @click="handleCancelAssignment(assignment.assignmentId, assignment.testTitle)"
                              class="w-full text-left px-4 py-2 text-sm text-yellow-600 hover:bg-yellow-50 flex items-center transition-colors"
                          >
                            <i class="mdi mdi-cancel mr-3"></i>
                            İptal Et
                          </button>

                          <button
                              v-if="assignment.status === 'Pending'"
                              @click="handleDeleteAssignment(assignment.assignmentId, assignment.testTitle)"
                              class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors"
                          >
                            <i class="mdi mdi-delete mr-3"></i>
                            Sil
                          </button>
                        </template>

                        <!-- Invalidated için menü -->
                        <template v-if="assignment.status === 'Invalidated'">
                          <button
                              @click="handleDeleteAssignment(assignment.assignmentId, assignment.testTitle)"
                              class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors"
                          >
                            <i class="mdi mdi-delete mr-3"></i>
                            Sil
                          </button>
                        </template>
                      </div>
                    </div>
                  </div>

                  <!-- Expired: Sadece tire göster -->
                  <span v-if="assignment.status === 'Expired'" class="text-gray-300 text-sm">─</span>
                </div>
              </td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <AssignTestModal
        v-if="showAssignModal"
        :candidate-ids="[candidateId]"
        @close="showAssignModal = false"
        @success="handleTestAssigned"
    />

    <ImportMmpiModal
        v-if="showImportModal"
        :candidate-id="candidateId"
        @close="showImportModal = false"
        @success="handleMmpiImported"
    />

    <ResendInvitationModal
        v-if="showResendModal && selectedAssignment"
        :assignment-id="selectedAssignment.assignmentId"
        :candidate-name="candidate.fullName"
        :test-title="selectedAssignment.testTitle"
        @close="showResendModal = false"
        @success="handleResendSuccess"
    />

    <CandidateFormModal
        v-if="showEditModal"
        :is-edit-mode="true"
        :candidate-data="candidate"
        @close="showEditModal = false"
        @saved="handleProfileUpdated"
        @delete="handleDeleteCandidate"
    />
  </div>
</template>