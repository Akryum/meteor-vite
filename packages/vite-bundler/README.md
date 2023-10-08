# meteor-vite

Use [Vite](https://vitejs.dev) in your Meteor app! ⚡️

## Roadmap

- [x] Development mode
- [x] Build
- [x] Importing non-core Meteor packages
- [x] Lazy meteor packages
- [ ] Reify support
  - [x] Named exports
  - [x] Default exports
  - [x] Re-exports (named + wildcard)
  - [ ] Re-exports via intermediary variable (not tested)
- [x] Code-splitting/Dynamic imports
- [ ] SSR (not tested)
- [x] Galaxy deployment [link](https://vite-and-vue3.meteorapp.com/)

## Installation

```sh
meteor add vite:bundler && meteor npm i -D vite
```

You can also install any vite plugin, for example `@vitejs/plugin-vue`:

```sh
meteor npm i -D @vitejs/plugin-vue
```

Make sure to have an import client entry (`meteor.mainModule.client`) in your `package.json`:

```json
{
  "name": "my-app",
  "private": true,
  "scripts": {
    "dev": "meteor run",
    "build": "meteor build ../output/vue --directory"
  },
  "dependencies": {
    "@babel/runtime": "^7.17.9",
    "meteor-node-stubs": "^1.2.1",
    "vue": "^3.2.37"
  },
  "devDependencies": {
    "@types/meteor": "^1.4.87",
    "@vitejs/plugin-vue": "^3.0.3",
    "typescript": "^4.6.3",
    "vite": "^3.0.9"
  },
  "meteor": {
    "mainModule": {
      "client": "client/main.ts",
      "server": "server/main.ts"
    },
    "testModule": "tests/main.js"
  }
}
```

You can leave your Meteor client entry file empty, but it's necessary to enable Meteor import mode. In the example above, we can create an empty `client/main.ts` file.

Create a Vite configuration file (`vite.config.js`) in your project root:

```js
import { defineConfig } from 'vite'
// Example with Vue
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [
    vue(),
  ],
  // Other vite options here...
})
```

As we don't use a standard Vite `index.html` file, we need to specify an entry point (different from the Meteor one):

```js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [
    vue(),
  ],

  meteor: {
    clientEntry: 'imports/ui/main.ts',
  },
})
```

You can then write your code from this entry point and it will be handled by Vite! ⚡️

## Lazy Loaded Meteor Packages
Meteor-Vite will automatically detect lazy loaded Meteor packages and import them into your Meteor client's entrypoint.
This is necessary to ensure that the Vite bundler has access to your Meteor packages.

The imported files can safely be committed to your project repository. If you remove the associated package in the 
future, simply remove the import statement.

Our detection for these packages is fairly primitive, so it's best to keep the imports in the Meteor client 
entrypoint as specified in the `meteor.mainModule.client` field of your `package.json` file.
```json5
{
  "meteor": {
    "mainModule": {
      "client": "client/main.ts", // Lazy loaded packages are checked for and added here.
      "server": "server/main.ts"
    }
  }
}
```

