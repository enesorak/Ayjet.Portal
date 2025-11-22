/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}", // <-- Bu satırı ekliyoruz
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}