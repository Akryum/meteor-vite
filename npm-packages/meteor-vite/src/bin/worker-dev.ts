import fs from 'node:fs/promises'
import { createServer, ResolvedConfig, ViteDevServer } from 'vite';
import Path from 'path';
import { MeteorStubs } from '../vite/plugin';

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
    const config = server.config as MeteorViteConfig;
    
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


interface MeteorViteConfig extends ResolvedConfig {
    meteor?: {
        /**
         * Vite client entry into Meteor.
         * Not to be confused with your Meteor mainModule.
         *
         * @link https://github.com/Akryum/meteor-vite/blob/main/packages/vite-bundler/README.md
         */
        clientEntry?: string;
    }
}