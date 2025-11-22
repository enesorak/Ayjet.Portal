import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'
import { useAuthStore } from '@/stores/authStore'
import NotFound from "@/views/NotFound.vue";

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            name: 'home',
            component: HomeView,
            meta: { requiresAuth: true, breadcrumb: 'Ana Sayfa' }
        },
        {
            path: '/login',
            name: 'login',
            component: LoginView,
            meta: { layout: 'AuthLayout' }
        },
        {
            path: '/test-definitions',
            name: 'test-definitions',
            component: () => import('../views/TestDefinitionsView.vue'),
            meta: { requiresAuth: true, breadcrumb: 'Test Yönetimi' }
        },
        {
            path: '/test-definitions/:testId/questions',
            name: 'test-questions',
            component: () => import('../views/TestQuestionsView.vue'),
            meta: {
                requiresAuth: true,
                breadcrumb: 'Soru Yönetimi',
                parent: 'test-definitions'
            },
            props: true
        },
        {
            path: '/test-definitions/:testId/questions/psychometric/:id/edit',
            name: 'psychometric-question-editor',
            component: () => import('../views/PsychometricQuestionEditorView.vue'),
            meta: {
                requiresAuth: true,
                breadcrumb: 'Soru Düzenle',
                parent: 'test-questions'
            },
            props: true
        },
        {
            path: '/candidates',
            name: 'candidates',
            component: () => import('../views/CandidatesView.vue'),
            meta: { requiresAuth: true, breadcrumb: 'Aday Yönetimi' }
        },
        {
            path: '/candidates/:candidateId/report',
            name: 'candidate-report',
            component: () => import('../views/CandidateReportView.vue'),
            meta: { requiresAuth: true, breadcrumb: 'Aday Raporu', parent: 'candidates' },
            props: true
        },
        {
            path: '/test-assignments',
            name: 'test-assignments',
            component: () => import('../views/TestAssignmentsView.vue'),
            meta: { requiresAuth: true, breadcrumb: 'Test Atamaları' }
        },
        {
            path: '/test-results/:assignmentId',
            name: 'test-results',
            component: () => import('../views/TestResultView.vue'),
            meta: { requiresAuth: true, breadcrumb: 'Sonuç Raporu', parent: 'test-assignments' },
            props: true
        },
        {
            path: '/users',
            name: 'users',
            component: () => import('../views/UsersView.vue'),
            meta: { requiresAuth: true, breadcrumb: 'Kullanıcı Yönetimi' }
        },
        {
            path: '/take-test/:assignmentId',
            name: 'take-test',
            component: () => import('../views/TakeTestView.vue'),
            meta: { layout: 'AuthLayout' },
            props: true
        },
        {
            path: '/take-test/:assignmentId',
            name: 'test-start', // Rota adını değiştiriyoruz
            component: () => import('@/views/TestStartView.vue'), // Yeni component'i işaret ediyor
            props: true,
            meta: { requiresAuth: false } // Adayın login olması gerekmez
        },
        {
            path: '/test-completed',
            name: 'test-completed',
            component: () => import('../views/TestCompletedView.vue'),
            meta: { layout: 'AuthLayout' }
        }
,
        {
            path: '/candidates/:candidateId',
            name: 'candidate-detail',
            component: () => import('@/views/CandidateDetailView.vue'),
            props: true,
            meta: { requiresAuth: true }
        },



        {
            path: '/:pathMatch(.*)*',
            name: 'NotFound',
            component: NotFound
        }
    ]
})

// Navigation Guard (Yönlendirme Koruması)
router.beforeEach((to, from, next) => {
    const authStore = useAuthStore();
    const requiresAuth = to.meta.requiresAuth;

    if (requiresAuth && !authStore.isAuthenticated) {
        next({ name: 'login' });
    }
    else if (to.name === 'login' && authStore.isAuthenticated) {
        next({ name: 'home' });
    }
    else {
        next();
    }
})

export default router