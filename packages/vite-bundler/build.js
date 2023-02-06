import path from 'node:path'
import { performance } from 'node:perf_hooks'
import fs from 'fs-extra'
import { execaSync } from 'execa'
import pc from 'picocolors'

if (process.env.VITE_METEOR_DISABLED) return
if (process.env.NODE_ENV !== 'production') return

const cwd = guessCwd()

// Not in a project (publishing the package)
if (!fs.existsSync(path.join(cwd, 'package.json'))) return

const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'))
const meteorMainModule = pkg.meteor?.mainModule?.client
if (!meteorMainModule) {
  throw new Error('No meteor main module found, please add meteor.mainModule.client to your package.json')
}

// Temporary Meteor build

const filesToCopy = [
  path.join('.meteor', '.finished-upgraders'),
  path.join('.meteor', '.id'),
  path.join('.meteor', 'packages'),
  path.join('.meteor', 'platforms'),
  path.join('.meteor', 'release'),
  path.join('.meteor', 'versions'),
  'package.json',
  meteorMainModule,
]

const tempMeteorProject = path.resolve(cwd, 'node_modules', '.vite-meteor-temp')

// Vite worker

const viteOutDir = path.join(cwd, 'node_modules', '.vite-meteor', 'dist')
const payloadMarker = '_vite_result_payload_'

const workerSource = `import path from 'node:path'
import fs from 'node:fs/promises'
import { build, resolveConfig } from 'vite'

const meteorPackageReg = /Package\\._define\\("(.*?)"(?:,\\s*exports)?,\\s*{\\n((?:\\s*(?:\\w+):\\s*\\w+,?\\n)+)}\\)/

const viteConfig = await resolveConfig({})

let stubUid = 0

const results = await build({
  build: {
    lib: {
      entry: viteConfig.meteor.clientEntry,
      formats: ['es'],
    },
    rollupOptions: {
      output: {
        entryFileNames: 'meteor-entry.js',
        chunkFileNames: '[name].js',
      },
    },
    outDir: ${JSON.stringify(viteOutDir)},
    minify: false,
  },
  plugins: [
    {
      name: 'meteor-stubs',
      resolveId (id) {
        if (id.startsWith('meteor/')) {
          return \`\\0\${id}\`
        }
      },
      async load (id) {
        if (id.startsWith('\\0meteor/')) {
          id = id.slice(1)
          const file = path.join(${JSON.stringify(tempMeteorProject)}, '.dist', 'bundle', 'programs', 'web.browser', 'packages', \`\${id.replace(\/^meteor\\/\/, '').replace(/:/g, '_')}.js\`)
          const content = await fs.readFile(file, 'utf8')
          const moduleStartIndex = content.indexOf('function module(require,exports,module')
          const moduleContent = content.slice(moduleStartIndex, content.indexOf('function module(require,exports,module', moduleStartIndex + 1))

          let code = \`const g = typeof window !== 'undefined' ? window : global\\n\`

          const exportedKeys = []

          // Meteor exports
          const [, packageName, exported] = /Package\\._define\\("(.*?)"(?:,\\s*exports)?,\\s*{\\n((?:\\s*(?:\\w+):\\s*\\w+,?\\n)+)}\\)/.exec(content) ?? []
          if (packageName) {
            const keys = exported.split('\\n').map(line => {
              const [,key] = /(\\w+):\\s*(?:\\w+)/.exec(line) ?? []
              return key
            }).filter(Boolean)
            exportedKeys.push(...keys)
            const generated = keys.map(key => \`export const \${key} = m.\${key}\`)
            code += \`const m = g.Package['\${packageName}']
\${generated.join('\\n')}\\n\`
          }

          // Modules re-exports
          let linkExports = []
          let linkResult
          const relativeExportKeys = []
          const linkReg = /module\\.link\\("(.*?)", {\\n((?:\\s*.+:\\s*.*\\n)+?)}, \\d+\\);/gm
          while (linkResult = linkReg.exec(moduleContent)) {
            linkExports.push([linkResult[1], linkResult[2]])
          }
          if (linkExports.length) {
            for (const linkExport of linkExports) {
              const isRelativeExport = linkExport[0].startsWith('.')
              let wildcard = ''
              const generated = linkExport[1].split('\\n').map(line => {
                const [,source,target] = /\\s*"?(.*?)"?:\\s*"(.*)"/.exec(line) ?? []
                if (source && target) {
                  if (isRelativeExport) {
                    relativeExportKeys.push(target)
                    return
                  } else if (source === '*' && target === '*') {
                    wildcard = '*'
                  } else if (source === target) {
                    return source
                  } else {
                    return \`\${source} as \${target}\`
                  }
                }
              }).filter(Boolean)
              const named = generated.length ? \`{\${generated.join(', ')}}\` : ''
              if (!isRelativeExport) {
                code += \`export \${[wildcard, named].filter(Boolean).join(', ')} from '\${linkExport[0]}'\\n\`
              }
            }
          }

          // Module exports
          let moduleExportsCode = ''
          const [, moduleExports] = /module\\.export\\({\\n((?:.*\\n)+?)}\\);/.exec(moduleContent) ?? []
          const hasModuleExports = !!moduleExports || !!relativeExportKeys.length
          const hasModuleDefaultExport = moduleContent.includes('module.exportDefault(')
          if (hasModuleExports || hasModuleDefaultExport) {
            const sid = stubUid++
            moduleExportsCode += \`let m2
const require = Package.modules.meteorInstall({
  '__vite_stub\${sid}.js': (require, exports, module) => {
    m2 = require('\${id}')
  },
}, {
  "extensions": [
    ".js",
  ]
})
require('/__vite_stub\${sid}.js')\\n\`
          }
          let finalHasModuleExports = false
          if (hasModuleExports) {
            const keys = moduleExports.split('\\n').map(line => {
              const [,key] = /(\\w+?):\\s*/.exec(line) ?? []
              return key
            }).concat(relativeExportKeys).filter(key => key && !exportedKeys.includes(key))
            exportedKeys.push(...keys)
            finalHasModuleExports = keys.length > 0
            const generated = keys.map(key => \`export const \${key} = m2.\${key}\`)
            moduleExportsCode += \`\${generated.join('\\n')}\\n\`
          }
          if (hasModuleDefaultExport) {
            moduleExportsCode += 'export default m2.default ?? m2\\n'
          }
          if (finalHasModuleExports || hasModuleDefaultExport) {
            code += moduleExportsCode
          }

          return code
        }
      },
    },
  ],
})

const result = Array.isArray(results) ? results[0] : results

// Result payload
process.stdout.write('${payloadMarker}')
process.stdout.write(JSON.stringify({
  success: true,
  meteorViteConfig: viteConfig.meteor,
  output: result.output.map(o => ({
    name: o.name,
    type: o.type,
    fileName: o.fileName,
  })),
}))
`
const workerFile = path.join(cwd, 'node_modules', '.meteor-vite-build-worker.mjs')

try {
  // Temporary Meteor build

  console.log(pc.blue('⚡️ Building packages to make them available to export analyzer...'))
  let startTime = performance.now()
  // Copy files from `.meteor`
  for (const file of filesToCopy) {
    const from = path.join(cwd, file)
    const to = path.join(tempMeteorProject, file)
    fs.ensureDirSync(path.dirname(to))
    fs.copyFileSync(from, to)
  }
  // Symblink to `packages` folder
  if (fs.existsSync(path.join(cwd, 'packages')) && !fs.existsSync(path.join(tempMeteorProject, 'packages'))) {
    fs.symlinkSync(path.join(cwd, 'packages'), path.join(tempMeteorProject, 'packages'))
  }
  // Remove minifier
  {
    const file = path.join(tempMeteorProject, '.meteor', 'packages')
    let content = fs.readFileSync(file, 'utf8')
    const lines = content.split('\n')
    content = lines.filter(line => !line.startsWith('standard-minifier')).join('\n')
    fs.writeFileSync(file, content)
  }
  // Remove server entry
  {
    const file = path.join(tempMeteorProject, 'package.json')
    const data = JSON.parse(fs.readFileSync(file, 'utf8'))
    data.meteor = {
      mainModule: {
        client: data.meteor.mainModule.client,
      },
    }
    fs.writeFileSync(file, JSON.stringify(data, null, 2))
  }
  // Only keep meteor package imports to enable lazy packages
  {
    const file = path.join(tempMeteorProject, meteorMainModule)
    const lines = fs.readFileSync(file, 'utf8').split('\n')
    const imports = lines.filter(line => line.startsWith('import') && line.includes('meteor/'))
    fs.writeFileSync(file, imports.join('\n'))
  }
  execaSync('meteor', [
    'build',
    './.dist',
    '--directory',
  ], {
    cwd: tempMeteorProject,
    // stdio: ['inherit', 'inherit', 'inherit'],
    env: {
      FORCE_COLOR: '3',
      VITE_METEOR_DISABLED: 'true',
    },
  })
  let endTime = performance.now()

  console.log(pc.green(`⚡️ Packages built (${Math.round((endTime - startTime) * 100) / 100}ms)`))

  // Vite

  console.log(pc.blue('⚡️ Building with Vite...'))
  startTime = performance.now()
  // Prepare worker
  fs.ensureDirSync(path.dirname(workerFile))
  fs.writeFileSync(workerFile, workerSource, 'utf8')

  fs.ensureDirSync(path.dirname(viteOutDir))

  // Build with vite
  const result = execaSync('meteor', [
    'node',
    workerFile,
  ], {
    cwd,
    stdio: ['inherit', 'pipe', 'inherit'],
    env: {
      FORCE_COLOR: '3',
    },
  })

  if (result.stdout.includes('\n')) {
    const index = result.stdout.indexOf(payloadMarker)
    process.stdout.write(result.stdout.substring(0, index))
    process.stdout.write('\n')
    const payload = JSON.parse(result.stdout.substring(index + payloadMarker.length))
    if (payload.success) {
      endTime = performance.now()
      console.log(pc.green(`⚡️ Build successful (${Math.round((endTime - startTime) * 100) / 100}ms)`))

      const entryAsset = payload.output.find(o => o.fileName === 'meteor-entry.js' && o.type === 'chunk')
      if (!entryAsset) {
        throw new Error('No meteor-entry chunk found')
      }

      // Add assets to Meteor

      // Copy the assets to the Meteor auto-imported sources
      const viteOutSrcDir = path.join(cwd, 'client', 'vite')
      fs.ensureDirSync(viteOutSrcDir)
      fs.emptyDirSync(viteOutSrcDir)
      const files = payload.output.map(o => o.fileName)
      for (const file of files) {
        const from = path.join(viteOutDir, file)
        const to = path.join(viteOutSrcDir, file)
        fs.ensureDirSync(path.dirname(to))

        if (path.extname(from) === '.js') {
          // Transpile to Meteor target (Dynamic import support)
          // @TODO don't use Babel
          const source = fs.readFileSync(from, 'utf8')
          const babelOptions = Babel.getDefaultOptions()
          babelOptions.babelrc = true
          babelOptions.sourceMaps = true
          babelOptions.filename = babelOptions.sourceFileName = from
          const transpiled = Babel.compile(source, babelOptions, {
            cacheDirectory: path.join(cwd, 'node_modules', '.babel-cache'),
          })
          fs.writeFileSync(to, transpiled.code, 'utf8')
        } else {
          fs.copyFileSync(from, to)
        }
      }

      // Patch meteor entry
      const meteorEntry = path.join(cwd, meteorMainModule)
      const originalEntryContent = fs.readFileSync(meteorEntry, 'utf8')
      const patchedEntryContent = `import ${JSON.stringify(`./${path.relative(path.dirname(meteorEntry), path.join(viteOutSrcDir, entryAsset.fileName))}`)}\n${originalEntryContent}`
      fs.writeFileSync(meteorEntry, patchedEntryContent, 'utf8')

      class Compiler {
        processFilesForTarget (files) {
          files.forEach(file => {
            switch (path.extname(file.getBasename())) {
              case '.js':
                file.addJavaScript({
                  path: file.getPathInPackage(),
                  data: file.getContentsAsString(),
                })
                break
              case '.css':
                file.addStylesheet({
                  path: file.getPathInPackage(),
                  data: file.getContentsAsString(),
                })
                break
              default:
                file.addAsset({
                  path: file.getPathInPackage(),
                  data: file.getContentsAsBuffer(),
                })
            }
          })
        }

        afterLink () {
          fs.removeSync(viteOutSrcDir)
          fs.writeFileSync(meteorEntry, originalEntryContent, 'utf8')
        }
      }

      Plugin.registerCompiler({
        extensions: [],
        filenames: files.map(file => path.basename(file)),
      }, () => new Compiler())
    } else {
      throw new Error('Vite build failed')
    }
  } else {
    throw new Error('Invalid stdout')
  }
} catch (e) {
  throw e
} finally {
  fs.removeSync(workerFile)
}

function guessCwd () {
  let cwd = process.env.PWD ?? process.cwd()
  const index = cwd.indexOf('.meteor')
  if (index !== -1) {
    cwd = cwd.substring(0, index)
  }
  return cwd
}
