/// <reference types="./packages/vite-bundler/index.d.ts" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [
    vue(),
  ],
  optimizeDeps: {
    exclude: [
        'ts-minitest',
    ]
  },

  meteor: {
    clientEntry: 'imports/ui/main.ts',
  },
})
