import path from 'node:path'
import fs from 'node:fs/promises'
import { createServer } from 'vite'

let stubUid = 0

process.on('message', async message => {
  if (message === 'start') {
    // Start server
    const server = await createServer({
      plugins: [
        {
          name: 'meteor-stubs',
          resolveId (id) {
            if (id.startsWith('meteor/')) {
              return `\0${id}`
            }
          },
          async load (id) {
            if (id.startsWith('\0meteor/')) {
              const file = path.join('.meteor', 'local', 'build', 'programs', 'web.browser', 'packages', `${id.replace('\0meteor/', '').replace(/:/g, '_')}.js`)
              const content = await fs.readFile(file, 'utf8')
              let code = `const g = typeof window !== 'undefined' ? window : global\n`
              
              // Meteor exports
              const [, packageName, exported] = /Package\._define\("(.*?)"(?:,\s*exports)?,\s*{\n((?:\s*(?:\w+):\s*\w+,?\n)+)}\)/.exec(content) ?? []
              if (packageName) {
                const generated = exported.split('\n').map(line => {
                  const [,key] = /(\w+):\s*(?:\w+)/.exec(line) ?? []
                  if (key) {
                    return `export const ${key} = m.${key}`
                  }
                  return ''
                }).filter(Boolean)
                code += `const m = g.Package.${packageName}
${generated.join('\n')}\n`
              }

              // Module exports
              const [, moduleExports] = /module\.export\({\n(.*\n)+?}\);/.exec(content) ?? []
              if (moduleExports) {
                const generated = moduleExports.split('\n').map(line => {
                  const [,key] = /(\w+?):\s*/.exec(line) ?? []
                  if (key) {
                    return `export const ${key} = m2.${key}`
                  }
                  return ''
                }).filter(Boolean)
                const sid = stubUid++
                code += `let m2
const require = Package.modules.meteorInstall({
  '__vite_stub${sid}.js': (require, exports, module) => {
    m2 = require('${id.replace('\0', '')}')
  },
}, {
  "extensions": [
    ".js",
  ]
})
require('/__vite_stub${sid}.js')
${generated.join('\n')}\n`
              }

              return code
            }
          },
        },
        {
          name: 'meteor-handle-restart',
          buildStart () {
            if (listening) {
              sendViteSetup()
            }
          },
        },
      ],
    })
    
    let listening = false
    await server.listen()
    sendViteSetup()
    listening = true
    
    function sendViteSetup () {
      process.send({
        kind: 'viteSetup',
        data: {
          host: server.config.server?.host,
          port: server.config.server?.port,
          entryFile: server.config.meteor?.clientEntry,
        },
      })
    }
  }
})
