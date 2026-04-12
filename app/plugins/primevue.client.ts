import PrimeVue from 'primevue/config'
import { primevueConfig } from '~/config/primevue'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Dropdown from 'primevue/dropdown'
import InputText from 'primevue/inputtext'
import Tag from 'primevue/tag'
import Tooltip from 'primevue/tooltip'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(PrimeVue, primevueConfig)

  // Register commonly used PrimeVue components
  nuxtApp.vueApp.component('Button', Button)
  nuxtApp.vueApp.component('DataTable', DataTable)
  nuxtApp.vueApp.component('Column', Column)
  nuxtApp.vueApp.component('Dropdown', Dropdown)
  nuxtApp.vueApp.component('InputText', InputText)
  nuxtApp.vueApp.component('Tag', Tag)

  // Register directive
  nuxtApp.vueApp.directive('tooltip', Tooltip)
})
