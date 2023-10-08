// A utility worker for development of the meteor-vite package.
// Just watches the contents of this package and re-compiles if there's any changes.
// Todo: Maybe trigger a reload on Meteor as well

import { spawn } from 'node:child_process'
import Path from 'node:path'
import CreateIPCInterface from './IPC/interface'

export default CreateIPCInterface({
  'tsup.watchMeteorVite': async function (reply) {
    const npmPackagePath = Path.join(process.cwd(), '/node_modules/meteor-vite/') // to the meteor-vite npm package
    const tsupPath = Path.join(npmPackagePath, '/node_modules/.bin/tsup-node') // tsup to 2 node_modules dirs down.

    const child = spawn(tsupPath, ['--watch'], {
      stdio: 'inherit',
      cwd: npmPackagePath,
      env: {
        FORCE_COLOR: '3',
      },
    })

    child.on('error', (error) => {
      throw new Error(`meteor-vite package build worker error: ${error.message}`, { cause: error })
    })

    child.on('exit', (code) => {
      if (!code)
        return

      process.exit(1)
      throw new Error('TSUp watcher exited unexpectedly!')
    })
  },
})
