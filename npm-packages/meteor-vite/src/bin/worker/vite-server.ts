import Path from 'path';
import { createServer, resolveConfig, ViteDevServer } from 'vite';
import { MeteorViteConfig } from '../../vite/MeteorViteConfig';
import { MeteorStubs } from '../../vite';
import { ProjectJson } from '../../vite/plugin/MeteorStubs';
import CreateIPCInterface, { IPCReply } from './IPC/interface';

let server: ViteDevServer;
let viteConfig: MeteorViteConfig;

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
    async 'vite.startDevServer'(reply: Replies, { packageJson }: { packageJson: ProjectJson }) {
        
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
        
        viteConfig = await resolveConfig({
            configFile: packageJson?.meteor?.viteConfig,
        }, 'serve');
        
        if (!server) {
            server = await createServer({
                configFile: viteConfig.configFile,
                plugins: [
                    MeteorStubs({
                        meteor: {
                            packagePath: Path.join('.meteor', 'local', 'build', 'programs', 'web.browser', 'packages'),
                            isopackPath: Path.join('.meteor', 'local', 'isopacks'),
                        },
                        packageJson,
                        stubValidation: viteConfig.meteor?.stubValidation,
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