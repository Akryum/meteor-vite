import { EventEmitter } from 'events';

type MeteorIPCTopic = 'webapp-reload-client' | 'webapp-pause-client' | 'client-refresh';

export type MeteorIPCMessage = {
    type: 'METEOR_IPC_MESSAGE',
    responseId: string,
    topic: MeteorIPCTopic,
    encodedPayload: string
}

export default new class MeteorEvents {
    protected readonly events = new EventEmitter();
    
    public awaitEvent(event: {
        /**
         * Meteor IPC event name.
         * E.g. webapp-reload-client, client-refresh
         */
        topic: MeteorIPCTopic,
        
        /**
         * How long to wait before rejecting the promise.
         * Useful to prevent a promise from hanging indefinitely.
         */
        timeoutMs: number
    }) {
        return new Promise<void>((resolve, reject) => {
            let rejected = false;
            let resolved = false;
            
            this.events.once(event.topic, () => {
                if (rejected) return;
                resolved = true;
                resolve()
            });
            
            setTimeout(() => {
                if (resolved) return;
                rejected = true;
                reject(new EventTimeout('Timed out waiting for client refresh event'));
            }, event.timeoutMs)
        })
    }
    
    public ingest(event: MeteorIPCMessage) {
        this.events.emit(event.type);
    }
}

export class EventTimeout extends Error {}