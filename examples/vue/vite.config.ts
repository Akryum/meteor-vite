import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import fs from 'fs/promises'

export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'meteor-stubs',
      resolveId (id) {
        if (id.startsWith('meteor/')) {
          return `\0${id}`
        }
      },
      async load (id) {
        if (id.startsWith('\0meteor/')) {
          const file = path.join('.meteor', 'local', 'build', 'programs', 'web.browser', 'packages', `${id.replace('\0meteor/', '')}.js`)
          const content = await fs.readFile(file, 'utf8')
          const [, packageName, exported] = /Package\._define\("(.*?)"(?:,\s*exports)?,\s*{\n((?:\s*(?:\w+):\s*\w+,?\n)+)}\)/.exec(content) ?? []
          if (packageName) {
            const generated: string[] = exported.split('\n').map(line => {
              const [,key] = /(\w+):\s*(?:\w+)/.exec(line) ?? []
              if (key) {
                return `export const ${key} = m.${key}`
              }
              return ''
            }).filter(Boolean)
            return `const g = typeof window !== 'undefined' ? window : global
const m = g.Package.${packageName}
${generated.join('\n')}`
          }
          return ''
        }
      }
    },
  ],
  server: {
    port: 3002,
  },
})
