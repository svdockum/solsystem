// Teacher pages (sessions, scanner, manage) require a login.
// Opt in per page: definePageMeta({ middleware: 'auth' })
export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore()
  if (!auth.user) {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
  }
})
