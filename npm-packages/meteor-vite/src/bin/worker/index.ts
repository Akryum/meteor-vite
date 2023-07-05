import { MeteorViteConfig } from '../../vite/MeteorViteConfig';
import { startViteDevServer } from './vite-server';
import { StartProductionBuild } from './production-build';

if (typeof process.send !== 'function') {
    throw new Error('Worker was not launched with an IPC channel!');
}

type WorkerMessage = keyof typeof IpcMethods;

const IpcMethods = {
    async startViteDevServer() {
        await startViteDevServer({
            viteConfig(config: MeteorViteConfig): void {
                process.send({
                    kind: 'viteConfig',
                    data: {
                        host: config.server?.host,
                        port: config.server?.port,
                        entryFile: config.meteor?.clientEntry,
                    },
                })
            },
        })
    }
}

process.on('message', async (message: WorkerMessage) => {
    if (!(message in IpcMethods)) {
        console.warn('Unrecognized worker IPC message', { message });
        return;
    }
    
    await IpcMethods[message]();
})