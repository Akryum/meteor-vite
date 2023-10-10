import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  meteor: {
    clientEntry: 'imports/vite-entrypoint.jsx',
  },
})
