<script setup lang="ts">
import {ref, onMounted, computed, onUnmounted} from 'vue';
import {useToast} from 'vue-toastification';
import {useRouter} from 'vue-router';
import apiClient from '@/api/apiClient';
import {resolveApiUrl} from '@/utils/urlHelper';
import {signalRService} from '@/services/signalRService';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import {Doughnut, Line as LineChart} from 'vue-chartjs';
import annotationPlugin from 'chartjs-plugin-annotation';
import jsPDF from 'jspdf'; // <-- PDF için import
import html2canvas from 'html2canvas';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, annotationPlugin);

const props = defineProps<{
  assignmentId: string;
}>();

const loading = ref(true);
const error = ref<string | null>(null);
const resultData = ref<any>(null);
const answerDetails = ref<any[]>([]);
const loadingAnalysis = ref(true);
const toast = useToast();
const router = useRouter();

const isGeneratingPdf = ref(false); // Buton durumu için
const reportContentRef = ref<HTMLElement | null>(null); // PDF'e aktarılacak alan

const isExportingCsv = ref(false); // ← YENİ: CSV export durumu


const exportAnswersToCSV = async () => {
  if (!resultData.value) {
    toast.error("Sonuç verisi henüz yüklenmedi.");
    return;
  }

  isExportingCsv.value = true;
  const toastId = toast.info("CSV dosyası hazırlanıyor...", { timeout: false });

  try {
    // Backend'den cevap detaylarını al
    const response = await apiClient.get(`/test-results/${props.assignmentId}/answer-analysis`);
    const answers = response.data;

    if (!answers || answers.length === 0) {
      toast.dismiss(toastId);
      toast.warning("İndirilecek cevap bulunamadı.");
      isExportingCsv.value = false;
      return;
    }

    // CSV içeriğini oluştur
    let csvContent = "soru,cevap\n";

    answers.forEach((answer: any, index: number) => {
      const questionNumber = index + 1;
      let answerValue = '';

      // Psychometric cevapları sayıya çevir
      if (answer.yourAnswer === 'Doğru' || answer.yourAnswer === 'True') {
        answerValue = '1';
      } else if (answer.yourAnswer === 'Yanlış' || answer.yourAnswer === 'False') {
        answerValue = '2';
      } else if (answer.yourAnswer === 'Fikrim Yok' || answer.yourAnswer === 'No Idea') {
        answerValue = '0';
      } else if (answer.yourAnswer === 'Cevaplanmamış') {
        answerValue = '0'; // Boş cevaplar için 0
      } else {
        // Multiple choice için - metin cevap varsa 1, yoksa 0
        answerValue = answer.yourAnswer !== 'Cevaplanmamış' ? '1' : '0';
      }

      csvContent += `${questionNumber},${answerValue}\n`;
    });

    // Blob oluştur ve indir
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `MMPI_Cevaplar_${resultData.value.candidate.fullName}_${new Date().toISOString().split('T')[0]}.csv`);
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
    toast.error("CSV dosyası oluşturulurken bir hata oluştu.");
  } finally {
    isExportingCsv.value = false;
  }
};

// --- PDF İNDİRME METODU (Son Kontrollü Hali) ---
const downloadPdfReport = async () => {
  if (!resultData.value) {
    toast.error("Rapor verisi henüz yüklenmedi.");
    return;
  }

  isGeneratingPdf.value = true;
  const toastId = toast.info("PDF raporu hazırlanıyor...", { timeout: false }); // ID'yi al

  try {
    // Backend endpoint'ine GET isteği gönder
    const response = await apiClient.get(
        `/test-results/${props.assignmentId}/pdf`, // Doğru API yolu
        {
          responseType: 'blob', // Yanıtı dosya olarak al
        }
    );

    // Yanıtın gerçekten bir blob ve PDF tipi olduğundan emin olalım (ekstra kontrol)
    if (!(response.data instanceof Blob) || response.data.type !== 'application/pdf') {
      throw new Error('Backend did not return a valid PDF file.');
    }

    // Yanıttan dosya adını al
    let fileName = `MMPI_Rapor_${props.assignmentId}.pdf`; // Varsayılan ad
    const contentDisposition = response.headers['content-disposition'];
    if (contentDisposition) {
      const fileNameMatch = contentDisposition.match(/filename="?(.+)"?/i);
      if (fileNameMatch && fileNameMatch.length > 1) {
        fileName = fileNameMatch[1];
      }
    }

    // *** İNDİRME TETİKLEME KISMI (EN KRİTİK BÖLÜM) ***
    // 1. Blob'dan geçici bir URL oluştur
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);

    // 2. Görünmez bir link elementi oluştur
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName); // İndirilecek dosya adını ayarla
    link.style.display = 'none'; // Linki gizle

    // 3. Linki DOM'a ekle (bu bazı tarayıcılar için gereklidir)
    document.body.appendChild(link);

    // 4. Linke tıkla (indirmeyi başlatır)
    link.click();

    // 5. Geçici URL ve link elementini temizle
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    // ***********************************************

    toast.dismiss(toastId); // "Hazırlanıyor" bildirimini kapat
    toast.success("PDF raporu başarıyla indirildi.");

  } catch (error: any) {
    toast.dismiss(toastId); // Hata durumunda da bildirimi kapat
    console.error("PDF download error:", error);
    // ... (Hata yönetimi kısmı öncekiyle aynı) ...
    let errorMessage = "PDF indirilirken bir hata oluştu.";
    if (error.response?.data instanceof Blob && error.response.data.type === "application/json") {
      try {
        const errorText = await error.response.data.text();
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.title || errorJson.message || errorMessage;
      } catch { /* Ignore parsing error */ }
    } else if (error.response?.status === 401) {
      errorMessage = "Bu raporu indirmek için yetkiniz yok.";
    } else if (error.response?.status === 404) {
      errorMessage = "İstenen rapor bulunamadı veya PDF desteği yok.";
    } else if (error.response?.status === 400) {
      errorMessage = "Geçersiz istek veya desteklenmeyen rapor türü.";
    } else if (error.message === 'Backend did not return a valid PDF file.') {
      errorMessage = "Sunucudan geçerli bir PDF dosyası alınamadı.";
    }
    toast.error(errorMessage);
  } finally {
    isGeneratingPdf.value = false;
  }
};

// --- YAZDIRMA METODU ---
const printReport = () => {
  // Tarayıcının yazdırma önizlemesini/dialogunu açar
  window.print();
};



const parsedDetails = computed(() => {
  if (!resultData.value?.details) return null;
  try {
    return JSON.parse(resultData.value.details);
  } catch (e) {
    return null;
  }
});

const testDuration = computed(() => {
  if (!resultData.value?.startedAt || !resultData.value?.completedAt) return "N/A";
  const start = new Date(resultData.value.startedAt);
  const end = new Date(resultData.value.completedAt);
  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) return "N/A";
  const diffMins = Math.floor(diffMs / 60000);
  const diffSecs = Math.round((diffMs % 60000) / 1000);
  return `${diffMins} dakika ${diffSecs} saniye`;
});

const doughnutChartData = computed(() => {
  console.log("doughnutChartData")
  console.log(resultData.value)
  // Güvenlik kontrolü: parsedDetails ve içindeki 'correct' alanı var mı?
  if (resultData.value?.testType !== 'MultipleChoice' || parsedDetails.value?.correct === undefined) {
    console.log("cıktım")
    return {labels: [], datasets: []};
  }
  const correct = parsedDetails.value.correct;
  console.log(correct)
  const incorrect = parsedDetails.value.incorrect ?? (parsedDetails.value.total - correct);

  console.log(incorrect)
  return {
    labels: ['Doğru', 'Yanlış'],
    datasets: [{backgroundColor: ['#4CAF50', '#F44336'], data: [correct, incorrect]}]
  };
});
const doughnutChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {legend: {display: false}},
  cutout: '70%' // Ortasının boş olmasını sağlar (doughnut efekti)
};

// --- CORRECTED LINE CHART DATA ---
const lineChartData = computed(() => {
  if (resultData.value?.testType !== 'Psychometric' || !parsedDetails.value?.TScores) {
    return { labels: [], datasets: [] };
  }
  const tScores = parsedDetails.value.TScores;

  // Define the scale order WITH the gap
  const scaleOrder = ["?", null, "L", "F", "K", null, "Hs", "D", "Hy", "Pd", "Mf", "Pa", "Pt", "Sc", "Ma", "Si"];
  // Define labels corresponding to the scale order
  const labels = ["?", "", "L", "F", "K", "", "Hs+5K", "D", "Hy", "Pd+4K", "Mf", "Pa", "Pt+1K", "Sc+1K", "Ma+2K", "Si"];


  const dataPoints = scaleOrder.map(scale => {
    if (scale === null) return null; // Insert null for the gap
    // Handle complex scale keys like 'Hs+5K' by extracting the base scale 'Hs'
    const baseScale = scale.includes('+') ? scale.substring(0, scale.indexOf('+')) : scale;
    return tScores[baseScale] ?? null; // Use null if score is missing
  });

  return {
    labels: labels, // Use the pre-defined labels array
    datasets: [{
      label: 'T-Puanları',
      backgroundColor: 'rgba(239, 68, 68, 0.2)', // Kırmızı dolgu (hafif opak - red-500)
      borderColor: 'rgb(220, 38, 38)',      // Kırmızı çizgi (red-600)
      pointBackgroundColor: 'rgb(185, 28, 28)', // Noktaların iç rengi (daha koyu kırmızı - red-800)
      pointBorderColor: 'rgb(185, 28, 28)',   // Noktaların kenar rengi
      pointHoverBackgroundColor: '#fff',       // Üzerine gelince nokta içi
      pointHoverBorderColor: 'rgb(185, 28, 28)',// Üzerine gelince nokta kenarı
      pointRadius: 4,                        // Nokta boyutu (varsayılan 3'tü)
      pointHoverRadius: 6,                   // Üzerine gelince nokta boyutu
      data: dataPoints, // Use the data with nulls
      fill: true,
      tension: 0.1,
      spanGaps: false // *** THIS IS CRITICAL: DO NOT connect lines over nulls ***
    }]
  };
});
// ------------------------------------

const lineChartOptions = computed(() => ({ /* ... (same as before, but check x-axis callback if needed) ... */
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {min: 0, max: 120, ticks: {stepSize: 5}},
    x: {
      offset: true,
      ticks: {
        callback: function (value, index) {
          // Use the labels array directly from chartData
          const label = lineChartData.value.labels[index];
          if (label === '' || !parsedDetails.value?.TScores) return ''; // Handle empty labels for gaps

          const scaleName = label.split('+')[0]; // Get base scale name (e.g., 'Hs' from 'Hs+5K')
          const score = parsedDetails.value.TScores[scaleName];

          // Only show score if it exists for the base scale
          return score !== undefined ? [label, `${score}`] : label;
        }
      }
    }
  },
  plugins: {
    legend: {display: true},
    annotation: {
      annotations: {
        clinicalThreshold: {
          type: 'line',
          yMin: 70,
          yMax: 70,
          borderColor: 'rgb(0, 0, 0)',
          borderWidth: 2,
          borderDash: [6, 6],
          label: {
            display: true,
            content: '', // Klinik Eşik (Clinical Threshold)
            position: 'end',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            font: { size: 10 }
          }
        },
        // Corrected separator index based on new scaleOrder with nulls
        validitySeparator: {type: 'line', xMin: 5.5, xMax: 5.5, borderColor: 'rgb(156, 163, 175)', borderWidth: 2 }
      }
    }
  }
}));

const tableData = computed(() => {
  if (resultData.value?.testType !== 'Psychometric' || !parsedDetails.value?.RawScores) {
    return {scales: [], rawScores: [], correctedScores: [], tScores: []};
  }
  const {RawScores, CorrectedScores, TScores} = parsedDetails.value;
  const scales = ["?", "L", "F", "K", "Hs", "D", "Hy", "Pd", "Mf", "Pa", "Pt", "Sc", "Ma", "Si"];

  const rawScoresData = scales.map(scale => RawScores[scale] ?? '-');
  const correctedScoresData = scales.map(scale => {
    // Eğer skala "?" ise, K-Düzeltmesi uygulanmaz, "-" göster.
    if (["?", "L", "F", "K","D","Hy","Mf","Pa","Si"].includes(scale)) {
      return "-";
    }
    // Diğer skalalar için mevcut mantığı uygula.
    const raw = RawScores[scale] ?? 0;
    // CorrectedScores'da o skala olmayabilir (örn. L, F, K için), varsa kullan, yoksa ham puanı kullan
    const corrected = CorrectedScores[scale] ?? raw;
    // Eğer düzeltilmiş puan ham puandan farklıysa, düzeltmeyi göster.
    const kCorrection = Math.round(corrected - raw);
    // Küçük ondalık farklarını (örn. 0.0001 gibi) göstermemek için Math.abs > 0.1 kontrolü eklenebilir.
    return kCorrection !== 0 ? `${Math.round(corrected)}` : `${raw}`;
  });
  const tScoresData = scales.map(scale => TScores[scale] ?? '-');

  return {
    scales: scales,
    rawScores: rawScoresData,
    correctedScores: correctedScoresData,
    tScores: tScoresData
  };
});

const formatDate = (dateString: string | null) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString('tr-TR', {dateStyle: 'long', timeStyle: 'short'});
};



// --- API METHODS ---
const fetchResultData = async () => {
  try {
    const response = await apiClient.get(`/test-results/${props.assignmentId}`);
    resultData.value = response.data;
  } catch (err) {
    error.value = "Sınav sonucu yüklenemedi.";
    toast.error(error.value);
  }
};

const fetchAnswerAnalysis = async () => {
  loadingAnalysis.value = true;
  try {
    const response = await apiClient.get(`/test-results/${props.assignmentId}/answer-analysis`);
    answerDetails.value = response.data;
  } catch (err) {
    toast.error("Cevap analizi yüklenirken bir hata oluştu.");
  } finally {
    loadingAnalysis.value = false;
  }
};

const handleRescore = async () => {
  try {
    await apiClient.post(`/test-results/${props.assignmentId}/re-score`);
    toast.info("Yeniden puanlama talebi alındı. Rapor kısa süre içinde güncellenecektir.");
  } catch (error) {
    toast.error("Yeniden puanlama sırasında bir hata oluştu.");
  }
};

const handleScoreUpdate = (message: string, updatedAssignmentId: string) => {
  if (props.assignmentId === updatedAssignmentId) {
    toast.success(message);
    fetchResultData();
    fetchAnswerAnalysis();
  }
};

// --- LIFECYCLE ---
onMounted(async () => {
  loading.value = true;
  await Promise.all([
    fetchResultData(),
    fetchAnswerAnalysis()
  ]);
  loading.value = false;

  signalRService.onScoreUpdate(handleScoreUpdate);
});

onUnmounted(() => {
  signalRService.onScoreUpdate(() => {
  });
});
</script>

<template>
  <div class="container mx-auto p-6 bg-gray-50 min-h-screen">
    <div v-if="loading" class="text-center py-20">Rapor Yükleniyor...</div>
    <div v-else-if="error" class="text-center py-20 text-red-500 bg-red-100 p-4 rounded">{{ error }}</div>

    <div v-else-if="resultData" class="w-full max-w-5xl mx-auto space-y-8">
      <!-- UPDATED: Header Section with Title and Action Buttons -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-4">
          <img class="h-16 w-16 rounded-full object-cover ring-4 ring-white shadow-lg"
               :src="resolveApiUrl(resultData.candidate.profilePictureUrl) || `https://ui-avatars.com/api/?name=${resultData.candidate.fullName.replace(' ', '+')}&background=random&color=fff`"
               :alt="resultData.candidate.fullName">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">Sınav Sonuç Raporu</h1>
            <p class="text-xl text-gray-600 mt-1">Aday: <span class="font-semibold">{{
                resultData.candidate.fullName
              }}</span></p>
          </div>
        </div>

        <!-- UPDATED: Action Buttons - Better organized and styled -->
        <div class="flex gap-3 no-print">
          <button @click="handleRescore"
                  class="bg-blue-600 text-white font-semibold py-2.5 px-5 rounded-lg hover:bg-blue-700 transition-colors flex items-center shadow-md hover:shadow-lg">
            <i class="mdi mdi-refresh mr-2"></i>
            Yeniden Puanla
          </button>

          <button @click="exportAnswersToCSV"
                  :disabled="isExportingCsv"
                  class="inline-flex items-center px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
            <i class="mdi mdi-file-delimited mr-2"></i>
            <span v-if="isExportingCsv">Hazırlanıyor...</span>
            <span v-else>CSV İndir</span>
          </button>


          <button @click="downloadPdfReport"
                  :disabled="isGeneratingPdf"
                  class="bg-red-600 text-white font-semibold py-2.5 px-5 rounded-lg hover:bg-red-700 transition-colors flex items-center shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
            <i class="mdi mdi-file-pdf-box mr-2"></i>
            <span v-if="isGeneratingPdf">Oluşturuluyor...</span>
            <span v-else>PDF Kaydet</span>
          </button>

          <button @click="printReport"
                  class="bg-gray-600 text-white font-semibold py-2.5 px-5 rounded-lg hover:bg-gray-700 transition-colors flex items-center shadow-md hover:shadow-lg">
            <i class="mdi mdi-printer mr-2"></i>
            Yazdır
          </button>
        </div>
      </div>

      <!-- REST OF THE TEMPLATE - UNCHANGED -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="bg-white p-6 rounded-lg shadow-md">
          <h2 class="text-sm font-medium text-gray-500 uppercase tracking-wider">Sınav Künyesi</h2>
          <div class="space-y-2 mt-3 text-base">
            <p><strong class="text-gray-600 w-32 inline-block">Test Adı:</strong> {{ resultData.testTitle }}</p>
            <p><strong class="text-gray-600 w-32 inline-block">Test Tipi:</strong> {{ resultData.testType }}</p>
            <p><strong class="text-gray-600 w-32 inline-block">Tarih:</strong> {{ formatDate(resultData.completedAt) }}</p>
            <p><strong class="text-gray-600 w-32 inline-block">T. Süresi:</strong> {{ testDuration }}</p>
          </div>
        </div>

        <div class="bg-white p-6 rounded-lg shadow-md">
          <h2 class="text-sm font-medium text-gray-500 uppercase tracking-wider">Aday Bilgileri</h2>
          <div class="space-y-2 mt-3 text-base">
            <p><strong class="text-gray-600 w-32 inline-block">Meslek:</strong> {{ resultData.candidate.profession || '-' }}</p>
            <p><strong class="text-gray-600 w-32 inline-block">Eğitim Durumu:</strong> {{ resultData.candidate.educationLevel || '-' }}</p>
            <p><strong class="text-gray-600 w-32 inline-block">Medeni Hal:</strong> {{ resultData.candidate.maritalStatus || '-' }}</p>
            <p><strong class="text-gray-600 w-32 inline-block">Cinsiyet:</strong> {{ resultData.candidate.gender || '-' }}</p>
            <p><strong class="text-gray-600 w-32 inline-block">Yaş:</strong> {{ resultData.candidate.age || '-' }}</p>
          </div>
        </div>

        <div class="bg-white p-6 rounded-lg shadow-md">
          <h2 class="text-sm font-medium text-gray-500 uppercase tracking-wider">Genel Skor</h2>
          <p v-if="resultData.testType === 'MultipleChoice' && parsedDetails" class="text-3xl font-bold text-gray-800 mt-2">
            {{ parsedDetails.correct }} / {{ parsedDetails.total }}
          </p>
          <p v-else class="text-xl text-gray-500 mt-2">Detaylar aşağıdadır</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="bg-white p-6 rounded-lg shadow-md" v-if="!resultData.testType">
          <h2 class="text-sm font-medium text-gray-500 uppercase tracking-wider">Doğru / Toplam</h2>
          <p v-if="resultData.testType === 'MultipleChoice' && parsedDetails"
             class="text-3xl font-bold text-gray-800 mt-2">
            {{ parsedDetails.correct }} / {{ parsedDetails.total }}
          </p>
          <p v-else class="text-3xl font-bold text-gray-800 mt-2">-</p>
        </div>
      </div>
      <div class="bg-white p-6 md:p-8 rounded-lg shadow-md">
        <h2 class="text-xl font-bold text-gray-800 mb-6">Profil Analizi</h2>
        <div v-if="resultData.testType === 'Psychometric'" class="h-96">
          <LineChart :data="lineChartData" :options="lineChartOptions"/>
        </div>

        <div v-else-if="resultData.testType === 'MultipleChoice'" class="h-64 w-64 mx-auto relative">
          <Doughnut :data="doughnutChartData" :options="doughnutChartOptions"/>
          <div class="absolute inset-0 flex items-center justify-center">
            <span class="text-6xl font-bold text-indigo-600">{{ resultData.score.toFixed(1) }}</span>
          </div>
        </div>


        <div   class="w-full max-w-5xl mx-auto space-y-8">
          <div v-if="resultData.testType === 'Psychometric'" class="bg-white p-6 md:p-8 rounded-lg shadow-md">

            <div class="overflow-x-auto">
              <table class="min-w-full text-sm text-center border-collapse">
                <tbody class="divide-y divide-gray-200">
                <tr class="bg-gray-100">
                  <td class="px-3 py-2 font-semibold text-left text-gray-600">Ölçek</td>
                  <td v-for="scale in tableData.scales" :key="scale" class="px-3 py-2 font-bold">{{ scale }}</td>
                </tr>
                <tr>
                  <td class="px-3 py-2 font-semibold text-left text-gray-600">Ham Puan</td>
                  <td v-for="(score, index) in tableData.rawScores" :key="index" class="px-3 py-2">{{ score }}</td>
                </tr>
                <tr>
                  <td class="px-3 py-2 font-semibold text-left text-gray-600">K+</td>
                  <td v-for="(score, index) in tableData.correctedScores" :key="index" class="px-3 py-2">{{ score }}</td>
                </tr>

                </tbody>
              </table>
            </div>
          </div>
          <div v-else-if="resultData" class="w-full max-w-5xl mx-auto space-y-8">

          </div>

      </div>


      </div>


      <div class="bg-white p-6 md:p-8 rounded-lg shadow-md">
        <h2 class="text-xl font-bold text-gray-800 mb-4">Cevap Analizi</h2>
        <div v-if="loadingAnalysis" class="text-center py-4">Analiz yükleniyor...</div>
        <div v-else class="space-y-6 max-h-[60vh] overflow-y-auto pr-3">
          <div v-for="(answer, index) in answerDetails" :key="index" class="border-t pt-4">
            <p class="font-semibold text-gray-800">{{ index + 1 }}. {{ answer.questionText }}</p>
            <div class="mt-2 pl-4 text-base">
              <p :class="[answer.wasCorrect ? 'text-green-700' : 'text-red-700']">
                <i class="mdi align-middle"
                   :class="[answer.wasCorrect ? 'mdi-check-circle-outline' : 'mdi-close-circle-outline']"></i>
                <span class="font-medium align-middle"> Sizin Cevabınız:</span>
                <span class="ml-2 align-middle">{{ answer.yourAnswer }}</span>
              </p>
              <p v-if="!answer.wasCorrect && resultData.testType === 'MultipleChoice'"
                 class="text-sm text-gray-600 mt-1 pl-1">
                <i class="mdi mdi-check"></i>
                <span class="font-medium">Doğru Cevap:</span>
                <span class="ml-2">{{ answer.correctAnswer }}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>