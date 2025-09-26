import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        obrigado: resolve(__dirname, 'obrigado.html'),
        termos: resolve(__dirname, 'termos-de-uso.html'),
        privacidade: resolve(__dirname, 'politica-de-privacidade.html')
      }
    }
  },
  server: {
    port: 3000
  }
})
