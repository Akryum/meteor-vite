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
              const moduleStartIndex = content.indexOf('function module(require,exports,module')
              const moduleContent = content.slice(moduleStartIndex, content.indexOf('function module(require,exports,module', moduleStartIndex + 1))

              let code = `const g = typeof window !== 'undefined' ? window : global\n`

              const exportedKeys = []
              
              // Meteor exports
              const [, packageName, exported] = /Package\._define\("(.*?)"(?:,\s*exports)?,\s*{\n((?:\s*(?:\w+):\s*\w+,?\n)+)}\)/.exec(content) ?? []
              if (packageName) {
                const keys = exported.split('\n').map(line => {
                  const [,key] = /(\w+):\s*(?:\w+)/.exec(line) ?? []
                  return key
                }).filter(Boolean)
                exportedKeys.push(...keys)
                const generated = keys.map(key => `export const ${key} = m.${key}`)
                code += `const m = g.Package['${packageName}']
${generated.join('\n')}\n`
              }

              // Modules re-exports
              let linkExports = []
              let linkResult
              const relativeExportKeys = []
              const linkReg = /module\.link\("(.*?)", {\n((?:\s*.+:\s*.*\n)+?)}, \d+\);/gm
              while (linkResult = linkReg.exec(moduleContent)) {
                linkExports.push([linkResult[1], linkResult[2]])
              }
              if (linkExports.length) {
                for (const linkExport of linkExports) {
                  const isRelativeExport = linkExport[0].startsWith('.')
                  let wildcard = ''
                  const generated = linkExport[1].split('\n').map(line => {
                    const [,source,target] = /\s*"?(.*?)"?:\s*"(.*)"/.exec(line) ?? []
                    if (source && target) {
                      if (isRelativeExport) {
                        relativeExportKeys.push(target)
                        return
                      } else if (source === '*' && target === '*') {
                        wildcard = '*'
                      } else if (source === target) {
                        return source
                      } else {
                        return `${source} as ${target}`
                      }
                    }
                  }).filter(Boolean)
                  const named = generated.length ? `{${generated.join(', ')}}` : ''
                  if (!isRelativeExport) {
                    code += `export ${[wildcard, named].filter(Boolean).join(', ')} from '${linkExport[0]}'\n`
                  }
                }
              }

              // Module exports
              let moduleExportsCode = ''
              const [, moduleExports] = /module\.export\({\n((?:.*\n)+?)}\);/.exec(moduleContent) ?? []
              const hasModuleExports = !!moduleExports || !!relativeExportKeys.length
              const hasModuleDefaultExport = moduleContent.includes('module.exportDefault(')
              if (hasModuleExports || hasModuleDefaultExport) {
                const sid = stubUid++
                moduleExportsCode += `let m2
const require = Package.modules.meteorInstall({
  '__vite_stub${sid}.js': (require, exports, module) => {
    m2 = require('${id}')
  },
}, {
  "extensions": [
    ".js",
  ]
})
require('/__vite_stub${sid}.js')\n`
              }
              let finalHasModuleExports = false
              if (hasModuleExports) {
                const keys = moduleExports.split('\n').map(line => {
                  const [,key] = /(\w+?):\s*/.exec(line) ?? []
                  return key
                }).concat(relativeExportKeys).filter(key => key && !exportedKeys.includes(key))
                exportedKeys.push(...keys)
                finalHasModuleExports = keys.length > 0
                const generated = keys.map(key => `export const ${key} = m2.${key}`)
                moduleExportsCode += `${generated.join('\n')}\n`
              }
              if (hasModuleDefaultExport) {
                moduleExportsCode += 'export default m2.default ?? m2\n'
              }
              if (finalHasModuleExports || hasModuleDefaultExport) {
                code += moduleExportsCode
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
