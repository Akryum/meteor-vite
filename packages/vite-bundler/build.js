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

// Meteor packages to omit or replace the temporary build.
// Useful for other build-time packages that may conflict with Meteor-Vite's temporary build.
const replaceMeteorPackages = [
  { startsWith: 'standard-minifier', replaceWith: '' },
  { startsWith: 'refapp:meteor-typescript', replaceWith: 'typescript' },
  ...pkg?.meteorVite?.replacePackages || []
]
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
  'tsconfig.json',
  meteorMainModule,
]

const tempMeteorProject = path.resolve(cwd, 'node_modules', '.vite-meteor-temp');
const meteorPackagePath = path.join(tempMeteorProject, '.dist', 'bundle', 'programs', 'web.browser', 'packages')

// Vite worker

const viteOutDir = path.join(cwd, 'node_modules', '.vite-meteor', 'dist')
const workerDir = path.join(cwd, 'node_modules', '.meteor-vite-build');
const workerEntrypoint = prepareWorkerFiles(workerDir).workerProd;
const payloadMarker = '_vite_result_payload_'

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
  // Remove/replace conflicting Atmosphere packages
  {
    const file = path.join(tempMeteorProject, '.meteor', 'packages')
    let content = fs.readFileSync(file, 'utf8')
    for (const pack of replaceMeteorPackages) {
      const lines = content.split('\n')
      content = lines.map(line => {
        if (!line.startsWith(pack.startsWith)) {
          return line;
        }
        return pack.replaceWith || '';
      }).join('\n')
    }
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

  fs.ensureDirSync(path.dirname(viteOutDir))

  // Build with vite
  const result = execaSync('meteor', [
    'node',
    workerEntrypoint,
    viteOutDir,
    meteorPackagePath,
    payloadMarker,
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
  fs.removeSync(workerDir)
}

function guessCwd () {
  let cwd = process.env.PWD ?? process.cwd()
  const index = cwd.indexOf('.meteor')
  if (index !== -1) {
    cwd = cwd.substring(0, index)
  }
  return cwd
}

function prepareWorkerFiles(workerDir) {
    const entries = Object.entries(ViteBuildPlugins.paths).map(([name, relativePath]) => {
        const absolutePath = path.join(workerDir, relativePath);
        const source = ViteBuildPlugins.sources[name];

        fs.ensureDirSync(path.dirname(absolutePath));
        fs.writeFileSync(absolutePath, source, 'utf8');

        return [name, absolutePath];
    });


    return Object.fromEntries(entries);
}
