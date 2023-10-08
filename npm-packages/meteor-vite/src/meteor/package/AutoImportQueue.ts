import FS from 'fs/promises'
import Logger from '../../Logger'
import { RefreshNeeded } from '../../vite/ViteLoadRequest'
import { viteAutoImportBlock } from './StubTemplate'
import PLimit from 'p-limit'

export const wait = (waitMs: number) => new Promise<void>(resolve => setTimeout(() => resolve(), waitMs))

export default new class AutoImportQueue {
  protected restartTimeout?: ReturnType<typeof setTimeout>
    protected addedPackages: string[] = []
    protected queueWrite = PLimit(1)
    protected onRestartWatchers: (() => void)[] = []
    
    /**
     * Once an import is added for a lazy-loaded package, the Meteor server needs to restart in order for the
     * package to become available to Vite.
     *
     * This countdown timer will start from the first auto-import and reset with every following import request
     * within the time limit. If no more requests are received, the server will finally restart.
     * @type {number}
     */
    public readonly RESTART_COUNTDOWN_MS = 2_500
    
    /**
     * Queues auto-imports for writing to disk to avoid race-conditions with concurrent write requests to the same file.
     */
    public async write({ importString, meteorEntrypoint, skipRestart }: {        meteorEntrypoint: string;        importString: string;        skipRestart?: boolean; // Skip restart when module is added to Meteor entrypoint    }) {
    const lastPackageCount = this.addedPackages.length
        const content = await FS.readFile(meteorEntrypoint, 'utf-8')
        
        if (content.includes(`'${importString}'`)) {
      Logger.debug('Skipping auto-import for "%s" as it already has all the necessary imports', importString)
            return;
    }

    await this.queueWrite(async () => {
      const content = await FS.readFile(meteorEntrypoint, 'utf-8')
      const newContent = viteAutoImportBlock({
        id: importString,
        content,
      })
            
            await FS.writeFile(meteorEntrypoint, newContent)
            this.addedPackages.push(importString)
            const logMessage = skipRestart
        ? 'Added auto-import for "%s" - you need to restart the server for the package to be usable'
        : 'Added auto-import for "%s" - server will restart shortly'
            
            Logger.info(logMessage, importString)
        })

    if (this.addedPackages.length > lastPackageCount && !skipRestart) 
            await this.scheduleRestart()
        
  }

  protected scheduleRestart() {
    if (this.restartTimeout) 
            clearTimeout(this.restartTimeout);
        

    this.restartTimeout = setTimeout(() => {
      this.onRestartWatchers.forEach(callListener => callListener())
        }, this.RESTART_COUNTDOWN_MS)

    return new Promise<void>((resolve, reject) => {
      this.onRestartWatchers.push(() => {
        reject(
          // Todo: Look into a better way for forcing a restart without needing a potentially confusing error
          new RefreshNeeded(`Terminating Vite server to load isopacks for new packages`, this.addedPackages),
                )
      })
    })
  }
}()