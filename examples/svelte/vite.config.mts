import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';
import { MeteorViteConfig } from 'meteor-vite';

declare module 'vite' {
  interface UserConfig extends Pick<MeteorViteConfig, 'meteor'> {}
}

export default defineConfig({
  plugins: [
    svelte(),
  ],

  meteor: {
    clientEntry: 'imports/ui/main.js',
    stubValidation: {
      warnOnly: true,
    }
  },
})
