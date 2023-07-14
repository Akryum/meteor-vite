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
                    resolve()
                });
            })
            
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