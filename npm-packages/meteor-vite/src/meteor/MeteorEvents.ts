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
    
    public awaitClientRefresh(timeoutMs: number) {
        return new Promise<void>((resolve, reject) => {
            let rejected = false;
            let resolved = false;
            
            this.events.once('webapp-reload-client', () => {
                if (rejected) return;
                resolved = true;
                resolve()
            });
            
            setTimeout(() => {
                if (resolved) return;
                rejected = true;
                reject(new EventTimeout('Timed out waiting for client refresh event'));
            }, timeoutMs)
        })
    }
    
    public ingest(event: MeteorIPCMessage) {
        this.events.emit(event.type);
    }
}

export class EventTimeout extends Error {}