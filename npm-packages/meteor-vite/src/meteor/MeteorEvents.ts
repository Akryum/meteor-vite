import { EventEmitter } from 'events';

type MeteorIPCTopic = 'webapp-reload-client' | 'webapp-pause-client' | 'client-refresh';

export type MeteorIPCMessage = {
    type: 'METEOR_IPC_MESSAGE',
    responseId: string,
    topic: MeteorIPCTopic,
    encodedPayload: string
}

export default new class MeteorEvents extends EventEmitter {
    public awaitClientRefresh() {
        return new Promise((resolve, reject) => {
            this.once('webapp-reload-client', resolve);
        })
    }
    
    public transmit(event: MeteorIPCMessage) {
        super.emit(event.type);
    }
    
    protected waitFor(eventName: MeteorIPCTopic, listener: (...args: any[]) => void) {
        return super.once(eventName, listener);
    }
}