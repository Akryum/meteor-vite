import FS from 'fs/promises';
import Logger from '../../Logger';
import { RefreshNeeded } from '../../vite/ViteLoadRequest';
import { viteAutoImportBlock } from './StubTemplate';

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
    public async write({ importString, meteorEntrypoint, skipRestart }: {
        meteorEntrypoint: string;
        importString: string;
        skipRestart?: boolean; // Skip restart when module is added to Meteor entrypoint
    }) {
        await this.prepareThread(importString, async () => {
            const content = await FS.readFile(meteorEntrypoint, 'utf-8')
            
            if (content.includes(`'${importString}'`)) {
                Logger.info('Skipping auto-import for "%s" as it already has all the necessary imports', importString);
                return;
            }
            
            const newContent = viteAutoImportBlock({
                id: importString,
                content,
            });
            
            await FS.writeFile(meteorEntrypoint, newContent);
            
            if (!skipRestart) {
                Logger.info(
                    'Added auto-import for "%s" - server will restart shortly with an error message',
                    importString
                );
                await this.scheduleRestart();
            } else {
                Logger.info(
                    'Added auto-import for "%s" - you need to restart the server for the package to be usable',
                    importString
                );
            }
        });
    }
    
    protected scheduleRestart() {
        if (this.restartTimeout) {
            clearTimeout(this.restartTimeout);
        }
        
        return new Promise((resolve, reject) => {
            this.restartTimeout = setTimeout(() => {
                // Todo: Look into a better way for forcing a restart without needing a potentially confusing error
                reject(new RefreshNeeded(`Terminating Vite server to load new Meteor modules`));
            }, 2500);
        })
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
            Logger.warn(
                'Detected multiple auto-import requests for the same threadId. Skipping write request',
                { requestId, existingRequest, threadId },
            )
            return true;
        }
        
        return false;
    }
    
}