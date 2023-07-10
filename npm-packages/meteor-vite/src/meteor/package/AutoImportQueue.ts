import FS from 'fs/promises';
import Logger from '../../Logger';
import { RefreshNeeded } from '../../vite/ViteLoadRequest';
import { viteAutoImportBlock } from './StubTemplate';

const wait = (waitMs: number) => new Promise<void>((resolve) => setTimeout(() => resolve(), waitMs));

export default new class AutoImportQueue {
    protected readonly requests = new Map<string, { threadId: string }>();
    protected queue: (() => Promise<void>)[] = [];
    protected restartTimeout?: ReturnType<typeof setTimeout>;
    protected workerId?: string;
    protected currentJob = Promise.resolve();
    protected addedPackages: string[] = [];
    
    /**
     * Queues auto-imports for writing to disk to avoid race-conditions with concurrent write requests to the same file.
     */
    public async write({ importString, meteorEntrypoint, skipRestart }: {
        meteorEntrypoint: string;
        importString: string;
        skipRestart?: boolean; // Skip restart when module is added to Meteor entrypoint
    }) {
        const lastPackageCount = this.addedPackages.length;
        const content = await FS.readFile(meteorEntrypoint, 'utf-8');
        
        if (content.includes(`'${importString}'`)) {
            Logger.debug('Skipping auto-import for "%s" as it already has all the necessary imports', importString);
            return;
        }
        
        await this.prepareThread(importString, async () => {
            const content = await FS.readFile(meteorEntrypoint, 'utf-8')
            const newContent = viteAutoImportBlock({
                id: importString,
                content,
            });
            
            await FS.writeFile(meteorEntrypoint, newContent);
            this.addedPackages.push(importString);
            
            if (skipRestart) {
                Logger.info(
                    'Added auto-import for "%s" - server will restart shortly with an error message',
                    importString
                );
                return;
            }
            
            Logger.info(
                'Added auto-import for "%s" - you need to restart the server for the package to be usable',
                importString
            );
        });
        if (this.addedPackages.length > lastPackageCount && !skipRestart) {
            await this.scheduleRestart()
        }
    }
    
    protected scheduleRestart() {
        if (this.restartTimeout) {
            clearTimeout(this.restartTimeout);
        }
        
        return new Promise<void>((resolve, reject) => {
            let rejected = false;
            setTimeout(() => !rejected && resolve(), 2550);
            
            this.restartTimeout = setTimeout(() => {
                rejected = true;
                this.requests.clear();
                
                // Todo: Look into a better way for forcing a restart without needing a potentially confusing error
                this.processQueuedImports().then(() => reject(new RefreshNeeded(`Terminating Vite server to load isopacks for new packages`, this.addedPackages)))
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
            this.queue.push(() => write().then(resolve)
                                         .catch(reject)
                                         .finally(() => this.requests.delete(importString)));
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
        const queue = this.queue;
        this.queue = [];
        
        for (const addImport of queue) {
            await addImport();
        }
        
        this.workerId = undefined;
    }
    
}