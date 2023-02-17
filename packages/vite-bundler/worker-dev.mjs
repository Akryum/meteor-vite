import fs from 'node:fs/promises'
import { createServer } from 'vite'
import { viteLoadPlugin } from './vite-load-plugin.mjs';
import Path from 'path';

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
          load: viteLoadPlugin(Path.join('.meteor', 'local', 'build', 'programs', 'web.browser', 'packages')),
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
