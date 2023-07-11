import fs from 'node:fs/promises';
import Path from 'path';
import { createServer, ViteDevServer } from 'vite';
import { MeteorViteConfig } from '../../vite/MeteorViteConfig';
import { MeteorStubs } from '../../vite';
import CreateIPCInterface, { IPCReply } from './IPC/interface';

let server: ViteDevServer;

type Replies = IPCReply<{
    kind: 'viteConfig',
    data: {
        host?: string | boolean;
        port?: number;
        entryFile?: string
    }
}>

export default CreateIPCInterface({
    // todo: Add reply for triggering a server restart
    async 'vite.startDevServer'(reply: Replies) {
        
        const sendViteConfig = (config: MeteorViteConfig) => {
            reply({
                kind: 'viteConfig',
                data: {
                    host: config.server?.host,
                    port: config.server?.port,
                    entryFile: config.meteor?.clientEntry,
                }
            })
        }
        
        if (!server) {
            server = await createServer({
                plugins: [
                    MeteorStubs({
                        meteor: {
                            packagePath: Path.join('.meteor', 'local', 'build', 'programs', 'web.browser', 'packages'),
                            isopackPath: Path.join('.meteor', 'local', 'isopacks'),
                        },
                        packageJson: JSON.parse(await fs.readFile('package.json', 'utf-8')),
                    }),
                    {
                        name: 'meteor-handle-restart',
                        buildStart () {
                            if (!listening) {
                                sendViteConfig(server.config);
                            }
                        },
                    },
                ],
            });
        }
        
        let listening = false
        await server.listen()
        sendViteConfig(server.config);
        listening = true
    }
})