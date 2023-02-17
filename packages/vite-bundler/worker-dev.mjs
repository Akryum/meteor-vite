import fs from 'node:fs/promises'
import { createServer } from 'vite'
import { viteLoadPlugin } from './vite-load-plugin.mjs';

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
          load: (id) => viteLoadPlugin(id),
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
