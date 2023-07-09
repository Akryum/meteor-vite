import FS from 'fs/promises';
import Logger from '../../Logger';
import { RefreshNeeded } from '../../vite/ViteLoadRequest';
import { viteAutoImportBlock } from './StubTemplate';

const wait = (waitMs: number) => new Promise<void>((resolve) => setTimeout(() => resolve(), waitMs));

export default new class AutoImportQueue {
    protected readonly requests = new Map<string, { threadId: string }>();
    protected readonly queue: (() => Promise<void>)[] = [];
    protected restartTimeout?: ReturnType<typeof setTimeout>;
    protected workerId?: string;
    protected currentJob = Promise.resolve();
    
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
                Logger.debug('Skipping auto-import for "%s" as it already has all the necessary imports', importString);
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
    
    protected async prepareThread(importString: string, write: () => Promise<void>)  {
        await this.currentJob;
        const threadId = Math.random().toString();
        const existingRequest = this.requests.get(importString);
        
        if (!this.workerId) {
            this.workerId = threadId;
        }
        
        if (existingRequest) {
            Logger.debug('Detected multiple import requests for "%s" - skipping import', importString);
            return;
        }
        
        this.requests.set(importString, { threadId: this.workerId });
        await wait(150);
        const writePromise = new Promise((resolve, reject) => {
            this.queue.push(() => write().then(resolve).catch(reject));
        });
        
        if (threadId !== this.workerId) {
            Logger.debug(
                'Detected concurrent auto-import requests for the same module. Waiting on other imports...',
                { importString, existingRequest, threadId: this.workerId },
            )
            return writePromise;
        }
        
        Logger.debug('Worker: %s - Processing import queue...', this.workerId);
        
        this.currentJob = this.currentJob.then(() => this.processQueuedImports());
        return writePromise;
    }
    
    protected async processQueuedImports() {
        for (const addImport of this.queue) {
            await addImport();
        }
        this.workerId = undefined;
    }
    
}