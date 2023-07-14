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
    
    public awaitClientRefresh() {
        return new Promise((resolve, reject) => {
            this.events.once('webapp-reload-client', resolve);
        })
    }
    
    public ingest(event: MeteorIPCMessage) {
        this.events.emit(event.type);
    }
}