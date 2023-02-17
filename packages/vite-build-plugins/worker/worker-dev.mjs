import fs from 'node:fs/promises'
import { createServer } from 'vite'
import Path from 'path';
import { MeteorStubs } from './vite-plugins/meteor-stubs.mjs';

process.on('message', async message => {
  if (message === 'start') {
    // Start server
    const server = await createServer({
      plugins: [
        MeteorStubs({
           meteorPackagePath: Path.join('.meteor', 'local', 'build', 'programs', 'web.browser', 'packages'),
           projectJson: JSON.parse(await fs.readFile('package.json', 'utf-8')),
        }),
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
