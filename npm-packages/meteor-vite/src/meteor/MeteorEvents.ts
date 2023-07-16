import { EventEmitter } from 'events';
import pc from 'picocolors';
import Logger from '../Logger';

type MeteorIPCTopic = 'webapp-reload-client' | 'webapp-pause-client' | 'client-refresh';

export type MeteorIPCMessage = {
    type: 'METEOR_IPC_MESSAGE',
    responseId: string,
    topic: MeteorIPCTopic,
    encodedPayload: string
}

export default new class MeteorEvents {
    protected readonly events = new EventEmitter();
    
    /**
     * Wait for one of the provided IPC message topics before resolving the promise.
     *
     * @param {{topics: MeteorIPCTopic[], timeoutMs: number}} event
     * @returns {Promise<void>}
     */
    public waitForMessage(event: {
        /**
         * Meteor IPC event name.
         * E.g. webapp-reload-client, client-refresh
         */
        topic: MeteorIPCTopic[],
        
        /**
         * How long to wait before rejecting the promise.
         * Useful to prevent a promise from hanging indefinitely.
         */
        timeoutMs: number
    }) {
        return new Promise<void>((resolve, reject) => {
            let rejected = false;
            let resolved = false;
            
            event.topic.forEach((topic) => {
                this.events.once(topic, () => {
                    if (rejected || resolved) return;
                    resolved = true;
                    resolve();
                    Logger.debug(`MeteorEvents event listener received an awaited event: ${pc.yellow(topic)}`)
                });
            })
            
            setTimeout(() => {
                if (resolved) return;
                rejected = true;
                reject(new EventTimeout('Timed out waiting for client refresh event'));
            }, event.timeoutMs)
        })
    }
    
    public ingest(message: MeteorIPCMessage) {
        Logger.debug('Received Meteor IPC message:', message);
        this.events.emit(message.topic);
    }
}


function awaitEvent<
    Emitter extends EventEmitter,
    EventParams extends Parameters<Emitter['once']>,
    EventName extends EventParams[0],
    ListenerArgs extends Parameters<EventParams[1]>
>(event: {
    name: EventParams[0];
    emitter: Emitter;
    timeoutMs: number;
}) {
    return new Promise<ListenerArgs>((_resolve, _reject) => {
        let rejected = false;
        let resolved = false;
        
        const listener = (data: ListenerArgs) => {
            resolve(data);
        }
        
        const reject = (error: Error) => {
            if (resolved || rejected) return;
            rejected = true;
            event.emitter.removeListener(event.name, listener);
            
            _reject(error);
        }
        
        const resolve = (data: ListenerArgs) => {
            if (resolved || rejected) return;
            resolved = true;
            
            _resolve(data);
        }
        
        event.emitter.once(event.name, listener);
        setTimeout(() => reject(new EventTimeout(`Timed out waiting for event: ${String(event.name)}`)), event.timeoutMs);
    })
}

export class EventTimeout extends Error {}