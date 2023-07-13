import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { MeteorViteConfig } from '../../npm-packages/meteor-vite';

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
    stubValidation: {
      warnOnly: true,
    }
  } satisfies MeteorViteConfig['meteor'],
})
