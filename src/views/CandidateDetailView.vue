<script setup lang="ts">
import { ref, onMounted } from 'vue';
import apiClient from '@/api/apiClient';
import { useToast } from 'vue-toastification';
import { resolveApiUrl } from '@/utils/urlHelper';
import { format } from 'date-fns';
import { RouterLink } from "vue-router";
import { useAuthStore } from "@/stores/authStore.ts";

import AssignTestModal from "@/components/TestAssignments/AssignTestModal.vue";
import ImportMmpiModal from "@/components/Candidate/ImportMmpiModal.vue";
import ResendInvitationModal from "@/components/TestAssignments/ResendInvitationModal.vue";

const props = defineProps<{
  candidateId: string;
}>();

const toast = useToast();
const authStore = useAuthStore();

const loading = ref(true);
const candidate = ref<any>(null);
const assignments = ref<any[]>([]);

// Modal states
const showAssignModal = ref(false);
const showImportModal = ref(false);
const showResendModal = ref(false);

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
  toast.success("Sınav başarıyla atandı. Liste güncelleniyor...");
  fetchCandidateData();
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return '-';
  return format(new Date(dateString), 'dd.MM.yyyy HH:mm');
};

const getStatusClass = (status: string) => {
  return {
    'bg-yellow-100 text-yellow-800': status === 'Pending',
    'bg-blue-100 text-blue-800': status === 'InProgress',
    'bg-green-100 text-green-800': status === 'Completed',
    'bg-red-100 text-red-800': status === 'Expired',
    'bg-orange-100 text-orange-800': status === 'Invalidated', // ← YENİ

  };
};

// --- DROPDOWN KONTROLÜ ---
const toggleDropdown = (assignmentId: string) => {
  if (openDropdownId.value === assignmentId) {
    openDropdownId.value = null;
  } else {
    openDropdownId.value = assignmentId;
  }
};

const closeDropdown = () => {
  openDropdownId.value = null;
};

// --- AKSIYON METODLARI ---

const handleCopyLink = (assignmentId: string) => {
  const testLink = `${window.location.origin}/take-test/${assignmentId}`;
  navigator.clipboard.writeText(testLink).then(() => {
    toast.success("Test linki kopyalandı!");
    closeDropdown();
  }).catch(() => {
    toast.error("Link kopyalanamadı.");
  });
};

const handleResendEmail = (assignment: any) => {
  selectedAssignment.value = assignment;
  showResendModal.value = true;
  closeDropdown();
};

const handleResendSuccess = () => {
  showResendModal.value = false;
  selectedAssignment.value = null;
  fetchCandidateData();
};

const handleWhatsAppShare = (assignment: any) => {
  const testLink = `${window.location.origin}/take-test/${assignment.assignmentId}`;

  // Telefon numarasını temizle (sadece rakamlar)
  let phoneNumber = candidate.value.phoneNumber || '';
  phoneNumber = phoneNumber.replace(/\D/g, ''); // Sadece rakamları tut

  // Türkiye numarası formatı kontrolü
  if (phoneNumber.startsWith('0')) {
    phoneNumber = '90' + phoneNumber.substring(1); // 0555... → 90555...
  } else if (!phoneNumber.startsWith('90')) {
    phoneNumber = '90' + phoneNumber; // 555... → 90555...
  }

  const message = encodeURIComponent(
      `Merhaba ${candidate.value.fullName},\n\n"${assignment.testTitle}" sınavı için davetiye linkiniz:\n${testLink}\n\nGeçerlilik tarihi: ${formatDate(assignment.expiresAt)}`
  );

  // Eğer numara varsa direkt numaraya gönder, yoksa genel paylaşım
  let whatsappUrl;
  if (phoneNumber && phoneNumber.length >= 10) {
    whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
  } else {
    // Numara yoksa kullanıcıya uyarı ver ve genel paylaşım yap
    toast.warning("Adayın telefon numarası kayıtlı değil. WhatsApp uygulaması açılacak, numarayı manuel girmeniz gerekecek.");
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

// YENİ: Sınavı Geçersiz İşaretle
const handleInvalidateTest = async (assignmentId: string, testTitle: string) => {
  closeDropdown();

  const reason = prompt(`"${testTitle}" sınavını neden geçersiz sayıyorsunuz? (İsteğe bağlı)`);
  if (reason === null) return; // Kullanıcı iptal etti

  try {
    // Backend endpoint'i eklenecek: POST /test-assignments/{id}/invalidate
    await apiClient.post(`/test-assignments/${assignmentId}/invalidate`, {
      reason: reason || "Belirtilmedi"
    });
    toast.success("Sınav geçersiz olarak işaretlendi.");
    fetchCandidateData();
  } catch (error: any) {
    const msg = error.response?.data?.title || "İşlem sırasında bir hata oluştu.";
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

    <div v-else-if="candidate" class="space-y-8">
      <!-- Profil Kartı -->
      <div class="bg-white p-6 rounded-lg shadow-md flex items-start space-x-6">
        <img
            class="h-32 w-32 rounded-full object-cover ring-4 ring-white"
            :src="resolveApiUrl(candidate.profilePictureUrl) || `https://ui-avatars.com/api/?name=${candidate.fullName.replace(' ', '+')}`"
            :alt="candidate.fullName"
        >
        <div class="flex-grow">
          <h1 class="text-3xl font-bold text-gray-800">{{ candidate.fullName }}</h1>
          <p class="text-lg text-gray-500">{{ candidate.email }}</p>
          <div class="mt-4 grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-sm text-gray-600">
            <p><strong class="font-medium text-gray-800">Yaş:</strong> {{ candidate.age || '-' }}</p>
            <p><strong class="font-medium text-gray-800">Cinsiyet:</strong> {{ candidate.gender || '-' }}</p>
            <p><strong class="font-medium text-gray-800">Medeni Hal:</strong> {{ candidate.maritalStatus || '-' }}</p>
            <p><strong class="font-medium text-gray-800">Eğitim:</strong> {{ candidate.educationLevel || '-' }}</p>
            <p><strong class="font-medium text-gray-800">Meslek:</strong> {{ candidate.profession || '-' }}</p>
            <p>
              <strong class="font-medium text-gray-800">Profil Onayı:</strong>
              <span :class="candidate.isProfileConfirmed ? 'text-green-600' : 'text-red-600'">
                {{ candidate.isProfileConfirmed ? 'Onaylandı' : 'Onaylanmadı' }}
              </span>
            </p>
          </div>
        </div>
      </div>

      <!-- Aksiyon Butonları -->
      <div class="flex items-start space-x-3">
        <button
            @click="showAssignModal = true"
            class="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center whitespace-nowrap"
        >
          <i class="mdi mdi-clipboard-text-plus-outline mr-2"></i>
          Yeni Sınav Ata
        </button>

        <button
            @click="showImportModal = true"
            class="bg-teal-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-teal-700 flex items-center whitespace-nowrap"
        >
          <i class="mdi mdi-file-upload-outline mr-2"></i>
          MMPI İçe Aktar (CSV)
        </button>
      </div>

      <!-- Atanan Sınavlar Tablosu -->
      <div class="bg-white p-6 rounded-lg shadow-md">
        <h2 class="text-xl font-bold text-gray-800 mb-4">Atanan Sınavlar</h2>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sınav Adı</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Atanma Tarihi</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bitiş Tarihi</th>
              <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">İşlemler</th>
            </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
            <tr v-if="assignments.length === 0">
              <td colspan="5" class="text-center py-6 text-gray-500">
                Bu adaya atanmış herhangi bir sınav bulunamadı.
              </td>
            </tr>
            <tr v-for="assignment in assignments" :key="assignment.assignmentId" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {{ assignment.testTitle }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm">
                  <span
                      class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                      :class="getStatusClass(assignment.status)"
                  >
                    {{ assignment.status }}
                  </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(assignment.createdAt) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(assignment.expiresAt) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center justify-center gap-2">
                  <!-- Sonucu Görüntüle - AYRI BUTON (Completed için) -->
                  <RouterLink
                      v-if="assignment.status === 'Completed'"
                      :to="{ name: 'test-results', params: { assignmentId: assignment.assignmentId } }"
                      class="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
                      title="Sonuç Raporunu Görüntüle"
                  >
                    <i class="mdi mdi-eye mr-1"></i>
                    Sonucu Gör
                  </RouterLink>

                  <!-- Dropdown Container -->
                  <div class="relative dropdown-container inline-block text-left">
                    <button
                        @click.stop="toggleDropdown(assignment.assignmentId)"
                        class="inline-flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                        title="Diğer İşlemler"
                    >
                      <i class="mdi mdi-dots-vertical text-xl"></i>
                    </button>

                    <!-- Dropdown Menu -->
                    <div
                        v-show="openDropdownId === assignment.assignmentId"
                        class="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                    >
                      <div class="py-1">
                        <!-- Linki Kopyala (Tüm durumlar için) -->
                        <button
                            @click="handleCopyLink(assignment.assignmentId)"
                            class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                        >
                          <i class="mdi mdi-content-copy mr-3 text-gray-500"></i>
                          Test Linkini Kopyala
                        </button>

                        <!-- Pending/InProgress: E-posta Gönder -->
                        <button
                            v-if="assignment.status === 'Pending' || assignment.status === 'InProgress'"
                            @click="handleResendEmail(assignment)"
                            class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                        >
                          <i class="mdi mdi-email-send mr-3 text-blue-600"></i>
                          E-posta Yeniden Gönder
                        </button>

                        <!-- Pending/InProgress: WhatsApp Paylaş -->
                        <button
                            v-if="assignment.status === 'Pending' || assignment.status === 'InProgress'"
                            @click="handleWhatsAppShare(assignment)"
                            class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                        >
                          <i class="mdi mdi-whatsapp mr-3 text-green-600"></i>
                          WhatsApp ile Paylaş
                        </button>

                        <!-- Ayırıcı Çizgi -->
                        <div
                            v-if="assignment.status === 'Pending' || assignment.status === 'InProgress' || assignment.status === 'Completed' || assignment.status === 'Expired'"
                            class="border-t border-gray-100 my-1"
                        ></div>

                        <!-- Completed: Geçersiz İşaretle -->
                        <button
                            v-if="assignment.status === 'Completed'"
                            @click="handleInvalidateTest(assignment.assignmentId, assignment.testTitle)"
                            class="w-full text-left px-4 py-2 text-sm text-orange-700 hover:bg-orange-50 flex items-center"
                        >
                          <i class="mdi mdi-close-circle mr-3"></i>
                          Geçersiz İşaretle
                        </button>

                        <!-- Pending/InProgress: İptal Et -->
                        <button
                            v-if="assignment.status === 'Pending' || assignment.status === 'InProgress'"
                            @click="handleCancelAssignment(assignment.assignmentId, assignment.testTitle)"
                            class="w-full text-left px-4 py-2 text-sm text-yellow-700 hover:bg-yellow-50 flex items-center"
                        >
                          <i class="mdi mdi-cancel mr-3"></i>
                          Sınavı İptal Et
                        </button>

                        <!-- Pending/Expired: Sil -->
                        <button
                            v-if="assignment.status === 'Pending' || assignment.status === 'Expired'"
                            @click="handleDeleteAssignment(assignment.assignmentId, assignment.testTitle)"
                            class="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center"
                        >
                          <i class="mdi mdi-delete mr-3"></i>
                          Sınavı Sil
                        </button>
                      </div>
                    </div>
                  </div>
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
  </div>
</template>