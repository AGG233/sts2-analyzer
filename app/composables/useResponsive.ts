export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const

export function useResponsive() {
  const isMobile = ref(false)
  const isTablet = ref(false)
  const isDesktop = ref(false)
  const width = ref(0)

  if (import.meta.client) {
    const update = () => {
      width.value = window.innerWidth
      isMobile.value = width.value < breakpoints.md
      isTablet.value = width.value >= breakpoints.md && width.value < breakpoints.lg
      isDesktop.value = width.value >= breakpoints.lg
    }

    onMounted(() => {
      update()
      window.addEventListener('resize', update)
    })

    onUnmounted(() => {
      window.removeEventListener('resize', update)
    })
  }

  return {
    isMobile,
    isTablet,
    isDesktop,
    width,
    breakpoints,
  }
}
