import fs from 'node:fs/promises';
import Path from 'path';
import { createServer, ViteDevServer } from 'vite';
import { MeteorViteConfig } from '../vite/MeteorViteConfig';
import { MeteorStubs } from '../vite';

process.on('message', async message => {
    if (message !== 'start') return;
    
    const server = await createServer({
        plugins: [
            MeteorStubs({
                meteorPackagePath: Path.join('.meteor', 'local', 'build', 'programs', 'web.browser', 'packages'),
                projectJsonContent: JSON.parse(await fs.readFile('package.json', 'utf-8')),
            }),
            {
                name: 'meteor-handle-restart',
                buildStart () {
                    if (!listening) {
                        sendViteSetup(server)
                    }
                },
            },
        ],
    });
    
    let listening = false
    await server.listen().then(() => {
        sendViteSetup(server)
        listening = true
    });
})

function sendViteSetup (server: ViteDevServer) {
    const config: MeteorViteConfig = server.config;
    
    if (typeof process.send !== 'function') {
        throw new Error('Worker was not launched with an IPC channel!');
    }
    
    process.send({
        kind: 'viteSetup',
        data: {
            host: config.server?.host,
            port: config.server?.port,
            entryFile: config.meteor?.clientEntry,
        },
    })
}


