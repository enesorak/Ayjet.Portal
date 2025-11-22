import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Environment değişkenlerini yükle
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      vue(),
      vueDevTools(), // Sadece development'ta aktif olacak
    ],

    base: '/', // Production'da root'ta çalışacak

    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      },
    },

    // Development server ayarları
    server: {
      port: 5173,
      strictPort: false, // Port meşgulse otomatik başka port bul
      open: false, // Browser'ı otomatik açma
      cors: true,

      // API proxy (Development için)
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL || 'https://localhost:7123',
          changeOrigin: true,
          secure: false, // Self-signed certificate için
          ws: true, // WebSocket support
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('❌ Proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('📤 Proxy request:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log('📥 Proxy response:', proxyRes.statusCode, req.url);
            });
          },
        }
      }
    },

    // Preview server ayarları (build sonrası test için)
    preview: {
      port: 4173,
      strictPort: false,
      open: false
    },

    // Build ayarları
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: mode === 'development', // Sadece dev'de sourcemap
      minify: mode === 'production' ? 'esbuild' : false,

      // Chunk strategy - vendor splitting
      rollupOptions: {
        output: {
          manualChunks: {
            'vue-vendor': ['vue', 'vue-router'],
            'ui-vendor': ['vue-toastification'],
            'http-vendor': ['axios']
          },
          // Asset isimlendirme
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
        }
      },

      // Chunk size uyarı limiti
      chunkSizeWarningLimit: 1000, // KB

      // Build optimizasyonu
      target: 'esnext',
      cssCodeSplit: true,

      // Assetsınline limiti
      assetsInlineLimit: 4096, // 4kb altındaki assetler inline olur
    },

    // Environment değişkenleri prefix
    envPrefix: 'VITE_',

    // CSS ayarları
    css: {
      devSourcemap: mode === 'development',
      preprocessorOptions: {
        // SCSS kullanıyorsanız
        // scss: {
        //   additionalData: `@import "@/styles/variables.scss";`
        // }
      }
    },

    // Optimizasyon
    optimizeDeps: {
      include: ['vue', 'vue-router', 'axios', 'vue-toastification'],
      exclude: ['vite-plugin-vue-devtools']
    },

    // Performans ve log ayarları
    logLevel: mode === 'production' ? 'warn' : 'info',
    clearScreen: false
  }
})