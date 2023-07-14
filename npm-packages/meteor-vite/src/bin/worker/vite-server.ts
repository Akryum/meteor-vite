import Path from 'path';
import { createServer, resolveConfig, ViteDevServer } from 'vite';
import Logger from '../../Logger';
import MeteorEvents, { MeteorIPCMessage } from '../../meteor/MeteorEvents';
import { MeteorViteConfig } from '../../vite/MeteorViteConfig';
import { MeteorStubs } from '../../vite';
import { ProjectJson } from '../../vite/plugin/MeteorStubs';
import { RefreshNeeded } from '../../vite/ViteLoadRequest';
import CreateIPCInterface, { IPCReply } from './IPC/interface';

let server: ViteDevServer & { config: MeteorViteConfig };
let viteConfig: MeteorViteConfig;

type Replies = IPCReply<{
    kind: 'viteConfig',
    data: {
        host?: string | boolean;
        port?: number;
        entryFile?: string
    }
} | {
    kind: 'refreshNeeded',
    data: {},
}>

export default CreateIPCInterface({
    async 'vite.getDevServerConfig'(replyInterface: Replies) {
        sendViteConfig(replyInterface);
    },
    
    async 'meteor.ipcMessage'(reply, data: MeteorIPCMessage) {
        MeteorEvents.transmit(data);
    },
    
    // todo: Add reply for triggering a server restart
    async 'vite.startDevServer'(replyInterface: Replies, { packageJson }: { packageJson: ProjectJson }) {
        
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
                                sendViteConfig(replyInterface);
                            }
                        },
                    },
                ],
            });
            
            process.on('warning', (warning) => {
                if (warning.name !== RefreshNeeded.name) {
                    return;
                }
                replyInterface({
                    kind: 'refreshNeeded',
                    data: {},
                })
            })
        }
        
        
        let listening = false
        await server.listen()
        sendViteConfig(replyInterface);
        listening = true
    }
})

function sendViteConfig(reply: Replies) {
    if (!server) {
        Logger.debug('Tried to get config from Vite server before it has been created!');
        return;
    }
    
    const { config } = server;
    
    reply({
        kind: 'viteConfig',
        data: {
            host: config.server?.host,
            port: config.server?.port,
            entryFile: config.meteor?.clientEntry,
        }
    })
}