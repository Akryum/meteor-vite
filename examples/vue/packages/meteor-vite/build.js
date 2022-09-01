import path from 'node:path'
import { performance } from 'node:perf_hooks'
import fs from 'fs-extra'
import { execaSync } from 'execa'
import pc from 'picocolors'

if (process.env.VITE_METEOR_DISABLED) return
if (process.env.NODE_ENV !== 'production') return

const cwd = process.env.PWD

// Temporary Meteor build

const filesToCopy = [
  '.finished-upgraders',
  '.id',
  'packages',
  'platforms',
  'release',
  'versions',
]

const tempMeteorProject = path.resolve(cwd, '.temp')

// Vite worker

const viteOutDir = path.join(cwd, 'node_modules', '.vite-meteor', 'dist')
const payloadMarker = '_vite_result_payload_'

const workerSource = `import path from 'node:path'
import fs from 'node:fs/promises'
import { build, resolveConfig } from 'vite'

const meteorPackageReg = /Package\\._define\\("(.*?)"(?:,\\s*exports)?,\\s*{\\n((?:\\s*(?:\\w+):\\s*\\w+,?\\n)+)}\\)/
const meteorPackageExportedReg = /(\\w+):\\s*(?:\\w+)/

const viteConfig = await resolveConfig({})

const result = await build({
  build: {
    outDir: ${JSON.stringify(viteOutDir)},
    assetsDir: 'assets',
    minify: false,
    rollupOptions: {
      input: {
        'meteor-entry': viteConfig.meteor.clientEntry,
      },
    },
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
          const file = path.join(${JSON.stringify(tempMeteorProject)}, '.dist', 'bundle', 'programs', 'web.browser', 'packages', \`\${id.replace('\\0meteor/', '')}.js\`)
          const content = await fs.readFile(file, 'utf8')
          const [, packageName, exported] = meteorPackageReg.exec(content) ?? []
          if (packageName) {
            const generated = exported.split('\\n').map(line => {
              const [,key] = meteorPackageExportedReg.exec(line) ?? []
              if (key) {
                return \`export const \${key} = m.\${key}\`
              }
              return ''
            }).filter(Boolean)
            return \`const g = typeof window !== 'undefined' ? window : global
const m = g.Package.\${packageName}
\${generated.join('\\n')}\`
          }
          return ''
        }
      },
    },
  ],
})

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
  const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'))
  const meteorMainModule = pkg.meteor?.mainModule?.client
  if (!meteorMainModule) {
    throw new Error('No meteor main module found, please add meteor.mainModule.client to your package.json')
  }

  // Temporary Meteor build

  console.log(pc.blue('⚡️ Building packages to make them available to export analyzer...'))
  let startTime = performance.now()
  fs.ensureDirSync(path.join(tempMeteorProject, '.meteor'))
  // Copy files from `.meteor`
  for (const file of filesToCopy) {
    const from = path.join(cwd, '.meteor', file)
    const to = path.join(tempMeteorProject, '.meteor', file)
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
  const result = execaSync('node', [
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

      const entryAsset = payload.output.find(o => o.name === 'meteor-entry' && o.type === 'chunk')
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
        fs.copyFileSync(from, to)
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
  fs.removeSync(tempMeteorProject)
}
