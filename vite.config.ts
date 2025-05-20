import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://mcs-erp-backend-807184488368.southamerica-west1.run.app',
        changeOrigin: true,
        secure: true
      }
    }
  }
})
