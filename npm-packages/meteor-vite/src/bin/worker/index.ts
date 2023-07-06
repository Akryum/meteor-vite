import { IPCReply } from './interface';
import { MeteorViteConfig } from '../../vite/MeteorViteConfig';
import ProductionBuilder from './production-build';
import ViteServerWorker from './vite-server';

const IpcMethods = {
    ...ViteServerWorker,
    ...ProductionBuilder,
} as const;

process.on('message', async (message: WorkerMethod) => {
    if (!message || !message.method || !(message.method in IpcMethods)) {
        console.error('Unrecognized worker IPC message', { message });
        return;
    }
    
    await IpcMethods[message.method]((response) => {
        validateIpcChannel(process.send);
        process.send(response);
    }, message.params as any);
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
