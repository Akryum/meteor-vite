import FS from 'fs/promises';
import { MeteorViteError } from '../../vite/ViteLoadRequest';

const wait = (waitMs: number) => new Promise<void>((resolve) => setTimeout(() => resolve(), waitMs));

export default new class AutoImportQueue {
    protected readonly requests = new Map<string, { threadId: string }>();
    protected readonly queue: Promise<void>[] = [];
    protected restartTimeout?: ReturnType<typeof setTimeout>
    
    protected getPromiseChain() {
        return Promise.all(this.queue);
    }
    
    /**
     * Queues auto-imports for writing to disk to avoid race-conditions with concurrent write requests to the same file.
     */
    public async write({ requestId, write: prepareContent, targetFile }: {
        targetFile: string;
        requestId: string;
        write: (mainModuleContent: string) => string | undefined;
    }) {
        await this.prepareThread(requestId, async () => {
            const newContent = prepareContent(await FS.readFile(targetFile, 'utf-8'));
            
            if (!newContent) {
                console.log('Skipping auto-import for "%s" as it already has all the necessary imports', requestId);
                return;
            }
            
            
            await FS.writeFile(targetFile, newContent);
            console.log('Added auto-import for "%s" - server will restart shortly with an error message', requestId);
            await this.scheduleRestart();
        });
    }
    
    protected scheduleRestart() {
        if (this.restartTimeout) {
            clearTimeout(this.restartTimeout);
        }
        
        setTimeout(() => {
            throw new RefreshNeeded(`Terminating Vite server to load new Meteor modules.`);
        }, 2500);
    }
    
    protected async prepareThread(requestId: string, run: () => Promise<void>)  {
        const threadId = Math.random().toString();
        this.requests.set(requestId, { threadId });
        
        await this.getPromiseChain();
        
        this.queue.push(wait(150).then(() => {
            if (this.hasDuplicate({ threadId, requestId })) {
                return;
            }
            
            return run();
        }));
        
        await this.getPromiseChain()
    }
    
    protected hasDuplicate({ threadId, requestId }: { threadId: string, requestId: string }) {
        const existingRequest = this.requests.get(requestId);
        
        if (!existingRequest) {
            throw new Error('You need to add request to queue before checking for duplicates!');
        }
        
        if (threadId !== existingRequest.threadId) {
            console.warn(
                'Detected multiple auto-import requests for the same threadId. Skipping write request',
                { requestId, existingRequest, threadId },
            )
            return true;
        }
        
        return false;
    }
    
}

class RefreshNeeded extends MeteorViteError {}