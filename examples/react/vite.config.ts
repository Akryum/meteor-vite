/// <reference types="./vite.config" />

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
  ],

  meteor: {
    clientEntry: 'imports/ui/main.ts',
  },
})
