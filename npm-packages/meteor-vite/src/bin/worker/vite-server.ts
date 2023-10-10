import Path from 'node:path'
import type { ViteDevServer } from 'vite'
import { createServer, resolveConfig } from 'vite'
import Logger from '../../Logger'
import type { MeteorIPCMessage } from '../../meteor/MeteorEvents'
import MeteorEvents from '../../meteor/MeteorEvents'
import type { MeteorViteConfig } from '../../vite/MeteorViteConfig'
import { MeteorStubs } from '../../vite'
import type { ProjectJson } from '../../vite/plugin/MeteorStubs'
import { RefreshNeeded } from '../../vite/ViteLoadRequest'
import type { IPCReply } from './IPC/interface'
import CreateIPCInterface from './IPC/interface'

let server: ViteDevServer & { config: MeteorViteConfig }
let viteConfig: MeteorViteConfig

type Replies = IPCReply<{
  kind: 'viteConfig'
  data: {
    host?: string | boolean
    port?: number
    entryFile?: string
  }
} | {
  kind: 'refreshNeeded'
  data: {
    [key: string]: never
  }
}>

interface DevServerOptions {
  packageJson: ProjectJson
  globalMeteorPackagesDir: string
}

export default CreateIPCInterface({
  'vite.getDevServerConfig': async function (replyInterface: Replies) {
    sendViteConfig(replyInterface)
  },

  'meteor.ipcMessage': async function (reply, data: MeteorIPCMessage) {
    MeteorEvents.ingest(data)
  },

  // todo: Add reply for triggering a server restart
  'vite.startDevServer': async function (replyInterface: Replies, { packageJson, globalMeteorPackagesDir }: DevServerOptions) {
    viteConfig = await resolveConfig({
      configFile: packageJson?.meteor?.viteConfig,
    }, 'serve')

    let listening = false

    if (!server) {
      server = await createServer({
        configFile: viteConfig.configFile,
        plugins: [
          MeteorStubs({
            meteor: {
              packagePath: Path.join('.meteor', 'local', 'build', 'programs', 'web.browser', 'packages'),
              isopackPath: Path.join('.meteor', 'local', 'isopacks'),
              globalMeteorPackagesDir,
            },
            packageJson,
            stubValidation: viteConfig.meteor?.stubValidation,
          }),
          {
            name: 'meteor-handle-restart',
            buildStart() {
              if (!listening)
                sendViteConfig(replyInterface)
            },
          },
        ],
      })

      process.on('warning', (warning) => {
        if (warning.name !== RefreshNeeded.name)
          return

        replyInterface({
          kind: 'refreshNeeded',
          data: {},
        })
      })
    }

    await server.listen()
    sendViteConfig(replyInterface)
    listening = true
  },
})

function sendViteConfig(reply: Replies) {
  if (!server) {
    Logger.debug('Tried to get config from Vite server before it has been created!')
    return
  }

  const { config } = server

  reply({
    kind: 'viteConfig',
    data: {
      host: config.server?.host,
      port: config.server?.port,
      entryFile: config.meteor?.clientEntry,
    },
  })
}
