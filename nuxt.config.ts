// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  // Client-side only: the Supabase login session lives in localStorage, and
  // the 3D scene (Three.js) and the barcode scanner (camera) need browser APIs.
  ssr: false,
  css: ['~/assets/css/main.css'],
  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt', '@vueuse/nuxt'],
  runtimeConfig: {
    public: {
      supabaseUrl: process.env.SUPABASE_URL ?? '',
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? '',
    },
  },
  app: {
    head: {
      title: 'SolSystem',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#000005' },
      ],
    },
  },
  vite: {
    optimizeDeps: {
      include: ['three'],
    },
  },
})
