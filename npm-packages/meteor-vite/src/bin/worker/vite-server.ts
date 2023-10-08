import fs from 'node:fs/promises'
import Path from 'node:path'
import type { ViteDevServer } from 'vite'
import { createServer, resolveConfig } from 'vite'
import type { MeteorViteConfig } from '../../vite/MeteorViteConfig'
import { MeteorStubs } from '../../vite'
import type { IPCReply } from './IPC/interface'
import CreateIPCInterface from './IPC/interface'

let server: ViteDevServer
let viteConfig: MeteorViteConfig

type Replies = IPCReply<{
  kind: 'viteConfig'
  data: {
    host?: string | boolean
    port?: number
    entryFile?: string
  }
}>

export default CreateIPCInterface({
  // todo: Add reply for triggering a server restart
  'vite.startDevServer': async function (reply: Replies) {
    const sendViteConfig = (config: MeteorViteConfig) => {
      reply({
        kind: 'viteConfig',
        data: {
          host: config.server?.host,
          port: config.server?.port,
          entryFile: config.meteor?.clientEntry,
        },
      })
    }

    viteConfig = await resolveConfig({}, 'serve')

    let listening = false

    if (!server) {
      server = await createServer({
        plugins: [
          MeteorStubs({
            meteor: {
              packagePath: Path.join('.meteor', 'local', 'build', 'programs', 'web.browser', 'packages'),
              isopackPath: Path.join('.meteor', 'local', 'isopacks'),
            },
            packageJson: JSON.parse(await fs.readFile('package.json', 'utf-8')),
            stubValidation: viteConfig.meteor?.stubValidation,
          }),
          {
            name: 'meteor-handle-restart',
            buildStart() {
              if (!listening)
                sendViteConfig(server.config)
            },
          },
        ],
      })
    }

    await server.listen()
    sendViteConfig(server.config)
    listening = true
  },
})
