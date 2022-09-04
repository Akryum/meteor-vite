import path from 'node:path'
import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import { createServer } from 'vite'

let stubUid = 0

process.on('message', async message => {
  if (message === 'start') {
    const pkg = JSON.parse(await fs.readFile('package.json', 'utf-8'))

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
              id = id.slice(1)
              const file = path.join('.meteor', 'local', 'build', 'programs', 'web.browser', 'packages', `${id.replace(/^meteor\//, '').replace(/:/g, '_')}.js`)
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
${generated.join('\n')}
export default m2.default ?? m2\n`
              }

              // Lazy (Isopack)
              const manifestFile = path.join('.meteor', 'local', 'isopacks', `${id.replace(/^meteor\//, '').replace(/:/g, '_')}`, 'web.browser.json')
              if (existsSync(manifestFile)) {
                const manifest = JSON.parse(await fs.readFile(manifestFile, 'utf8'))
                const resource = manifest.resources.find(r => r.fileOptions.mainModule)
                if (resource?.fileOptions.lazy) {
                  // Auto-import the package to make it available
                  if (!pkg.meteor?.mainModule?.client) {
                    throw new Error(`No meteor.mainModule.client found in package.json`)
                  }
                  const meteorClientEntryFile = path.resolve(process.cwd(), pkg.meteor.mainModule.client)
                  if (!existsSync(meteorClientEntryFile)) {
                    throw new Error(`meteor.mainModule.client file not found: ${meteorClientEntryFile}`)
                  }
                  const content = await fs.readFile(meteorClientEntryFile, 'utf8')
                  if (!content.includes(`'${id}'`)) {
                    await fs.writeFile(meteorClientEntryFile, `import '${id}'\n${content}`)
                    throw new Error(`Auto-imported package ${id} to ${meteorClientEntryFile}, please reload`)
                  }
                }
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
