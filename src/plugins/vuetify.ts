// styles
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

// vuetify
import { createVuetify } from 'vuetify'

export default createVuetify({
    theme: {
        defaultTheme: 'ayjetTheme', // Varsayılan tema olarak kendimizinkini seçiyoruz
        themes: {
            ayjetTheme: {
                dark: false, // Açık tema kullanacağız
                colors: {
                    background: '#FFFFFF', // Arka plan
                    surface: '#FFFFFF', // Kartlar, menüler gibi yüzeyler
                    primary: '#1E88E5', // Ana renk (canlı bir mavi)
                    secondary: '#424242', // İkincil renk (koyu gri)
                    error: '#B00020',
                    info: '#2196F3',
                    success: '#4CAF50',
                    warning: '#FB8C00',
                }
            }
        }
    }
})