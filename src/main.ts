import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { setupInterceptors } from './api/interceptors'

// Tailwind CSS'in temel stillerini uygulamaya dahil ediyoruz.
import './assets/main.css'

import Toast, {type PluginOptions, POSITION} from 'vue-toastification'
import 'vue-toastification/dist/index.css'


const app = createApp(App)

// Pinia'yı (state management) uygulamaya dahil et
app.use(createPinia())

// Router'ı uygulamaya dahil et
app.use(router)

setupInterceptors();
const options: PluginOptions = {
    position: POSITION.TOP_RIGHT,  // ← String yerine POSITION enum kullan
    timeout: 4000,
    closeOnClick: true,
    pauseOnFocusLoss: true,
    pauseOnHover: true,
    draggable: true,
    draggablePercent: 0.6,
    showCloseButtonOnHover: false,
    hideProgressBar: false,
    closeButton: "button",
    icon: true,
    rtl: false
};
app.use(Toast, options);
app.mount('#app')