import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * @return {import('vite').Plugin}
 */
function importReactFromMeteorBundle() {
  let reactChunk = '';
  return {
    name: 'output-gen',
    enforce: 'pre',
    resolveId(id, importer, options) {
      if (!importer.includes('/react.js?')) {
        return;
      }
      reactChunk = id.replace(/^.\//, '');
      console.log({ id, importer, options, reactChunk });
    },
    transform(code, id) {
      if (!reactChunk) {
        return;
      }
      if (!id.includes(`.vite/deps/${reactChunk}`)) {
        return;
      }
      console.log({ transformId: id, reactChunk });
      return `
      var __getOwnPropNames = Object.getOwnPropertyNames;
      var __commonJS = (cb, mod) => function __require() {
        return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
      };
      var require_react = () => require('react');
      export {
        __commonJS,
        require_react,
      }`
    },
  }
}

export default defineConfig({
  plugins: [
      react(),
      importReactFromMeteorBundle(),
  ],

  meteor: {
    clientEntry: "imports/vite-entrypoint.jsx",
  },
});
