import fs from 'node:fs/promises';
import Path from 'path';
import { createServer } from 'vite';
import { MeteorViteConfig } from '../../vite/MeteorViteConfig';
import { MeteorStubs } from '../../vite';
import CreateIPCInterface, { IPCReply } from './interface';


export default CreateIPCInterface({
    async startViteDevServer(reply: IPCReply<{
        kind: 'viteConfig',
        data: {
            host?: string | boolean;
            port?: number;
            entryFile?: string
        }
    }>) {
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
                            sendViteConfig(server.config);
                        }
                    },
                },
            ],
        });
        
        let listening = false
        await server.listen()
        sendViteConfig(server.config);
        listening = true
    }
})