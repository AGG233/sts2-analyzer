import { definePreset } from '@primeuix/themes'
import Aura from '@primeuix/themes/aura'
import type { PrimeVueConfiguration } from 'primevue/config'

// STS2 custom theme - gold primary, dark teal surfaces
export const StsPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#fcf0e0',
      100: '#f9d6b3',
      200: '#f3bc80',
      300: '#ec9f4c',
      400: '#e68824',
      500: '#e07400',
      600: '#cc6900',
      700: '#a85400',
      800: '#854200',
      900: '#6b3500'
    },
    colorScheme: {
      dark: {
        surface: {
          0: '#0a1628',
          50: '#11223f',
          100: '#18305a',
          200: '#22407a',
          300: '#2e529e',
          400: '#3c68c0',
          500: '#4a7fd4',
          600: '#6098e6',
          700: '#7cb8f5',
          800: '#9ac5f9',
          900: '#bed8fc',
          950: '#0a1628'
        }
      }
    }
  }
})

export const primevueConfig: PrimeVueConfiguration = {
  theme: {
    preset: StsPreset,
    options: {
      darkModeSelector: '.p-dark'
    }
  },
  ripple: true
}