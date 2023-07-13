import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';
import { MeteorViteConfig } from '../../npm-packages/meteor-vite';

declare module 'vite' {
  interface UserConfig extends Pick<MeteorViteConfig, 'meteor'> {}
}

defineConfig({
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
