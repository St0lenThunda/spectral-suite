import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import './style.css'
import '../../../packages/core/src/styles/theme.css'
import App from './App.vue'

const pinia = createPinia()
pinia.use( piniaPluginPersistedstate )

createApp( App ).use( pinia ).mount( '#app' )
