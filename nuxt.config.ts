// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  future: { compatibilityVersion: 4 },
  compatibilityDate: '2025-07-15',
  css: ['~/assets/css/main.css'],
  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt', '@vueuse/nuxt'],
  runtimeConfig: {
    public: {
      supabaseUrl: process.env.SUPABASE_URL ?? '',
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? '',
    },
  },
  // Three.js requires browser APIs — disable SSR for scene and join pages
  routeRules: {
    '/sun/**': { ssr: false },
    '/join/**': { ssr: false },
  },
  app: {
    head: {
      title: 'SolSystem',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
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
