import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';
import { MeteorViteConfig } from 'meteor-vite';

declare module 'vite' {
  interface UserConfig extends Pick<MeteorViteConfig, 'meteor'> {}
}

export default defineConfig({
  plugins: [
    svelte({
      configFile: 'svelte.config.mjs'
    })
  ],

  meteor: {
    clientEntry: 'imports/ui/main.ts',
    stubValidation: {
      warnOnly: true,
    }
  },
})
