import { IPCReply } from './interface';
import { MeteorViteConfig } from '../../vite/MeteorViteConfig';
import ProductionBuilder from './production-build';
import ViteServerWorker from './vite-server';

const IpcMethods = {
    ...ViteServerWorker,
    ...ProductionBuilder,
    // Todo: local builder for npm package
} as const;

process.on('message', async (message: WorkerMethod) => {
    if (!message || !message.method) {
        console.error('Vite: Unrecognized worker IPC message', { message });
        return;
    }
    
    const transmit = IpcMethods[message.method];
    
    if (typeof transmit !== 'function') {
        console.error(`Vite: The provided IPC method hasn't been defined yet!`, { message });
    }
    
    await transmit((response) => {
        validateIpcChannel(process.send);
        process.send(response);
    }, message.params as any).catch((error) => {
        console.error('Vite: worker process encountered an exception!', error);
    });
})


validateIpcChannel(process.send);

function validateIpcChannel(send: NodeJS.Process['send']): asserts send is Required<Pick<NodeJS.Process, 'send'>>['send'] {
    if (typeof process.send !== 'function') {
        throw new Error('Worker was not launched with an IPC channel!');
    }
}
export type WorkerMethod = { [key in keyof IPCMethods]: [name: key, method: IPCMethods[key]]
                           } extends {
                               [key: string]: [infer Name, infer Method]
                           } ? Name extends keyof IPCMethods
                               ? { method: Name, params: Parameters<IPCMethods[Name]> extends [infer Reply, ...infer Params]
                                                         ? Params
                                                         : [] }
                               : never
                             : never;

export type WorkerResponse = WorkerReplies[keyof IPCMethods][1];
type WorkerReplies = {
    [key in keyof IPCMethods]: IPCMethods[key] extends (reply: IPCReply<infer Reply>) => any
                               ? [Reply['kind'], Reply] : never;
};

export type IPCMethods = typeof IpcMethods;
export type WorkerResponseHooks = {
    [key in WorkerResponse['kind']]: (data: Extract<WorkerResponse, { kind: key }>['data']) => void;
}
