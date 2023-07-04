import { existsSync } from 'fs';
import FS from 'fs/promises';
import Path from 'path';
import type { PluginSettings } from './MeteorViteStubs';
import { viteAutoImportBlock } from './StubTemplate';

export default class ViteLoadRequest {
    
    public static async prepareContext(request: PreContextRequest) {
        if (!this.isStubRequest(request.id)) {
            throw new MeteorViteStubRequestError('Tried to set up file context for an unrecognized file path!');
        }
        
        const file = this.loadFileData(request);
        const manifest = await this.loadManifest({ file, ...request });
        
        return new ViteLoadRequest({
            file,
            manifest,
            ...request,
        })
    }
    
    public static resolveId(id: string) {
        if (id.startsWith('meteor/')) {
            return `\0${id}`
        }
    }
    
    public static isStubRequest(id: string) {
        return id.startsWith('\0meteor/');
    }
    
    /**
     * Slice off the request raw request identifier we use for determining whether to process the request or not.
     *
     * @example
     * '\0meteor/meteor' -> 'meteor/meteor'
     */
    public static getStubId(viteId: string) {
        return viteId.slice(1);
    }
   
    
    constructor(public readonly context: RequestContext ) {};
    
    /**
     * Forces an import statement for the current module into the user's Meteor mainModule.
     * Not to be confused with Vite's entrypoint.
     *
     * We do this to work around how Meteor deals with lazy-loaded packages.
     * @return {Promise<void>}
     */
    public async forceImport() {
        const mainModule = this.context.pluginSettings.projectJsonContent.meteor.mainModule;
        
        if (!mainModule?.client) {
            throw new MeteorViteError(`No meteor.mainModule.client found in package.json`)
        }
        
        const meteorClientEntryFile = Path.resolve(process.cwd(), mainModule.client);
        
        if (!existsSync(meteorClientEntryFile)) {
            throw new MeteorViteError(`meteor.mainModule.client file not found: ${meteorClientEntryFile}`)
        }
        
        const content = await FS.readFile(meteorClientEntryFile, 'utf8');
        
        if (!content.includes(`'${this.context.id}'`)) {
            await FS.writeFile(meteorClientEntryFile, viteAutoImportBlock({
                id: this.context.id,
                content,
            }));
            throw new RefreshNeeded(`Auto-imported package ${this.context.id} to ${meteorClientEntryFile}, please reload`)
        }
    }
    
    /**
     * Relative path (to the package) for the module to yield stubs for.
     *
     * @example formatting
     * this.context.id  // meteor/ostrio:cookies -> index.js (tries to detect mainModule)
     *
     * this.context.id // meteor/ostorio:cookies/some-file -> some-file.js
     * this.context.id // meteor/ostorio:cookies/dir/some-other-file -> dir/some-other-file.js
     */
    public requestedModulePath() {
        if (!this.context.file.importPath) {
            // todo: check manifest for mainModule
        }
        
        return this.context.file.importPath;
    }
    
    
    protected static loadFileData({ id, pluginSettings }: PreContextRequest) {
        let {
            /**
             * Base Atmosphere package import This is usually where we find the full package content, even for packages
             * that have multiple entry points.
             * E.g. `meteor/ostrio:cookies`
             * @type {string}
             */
            packageId,
            
            /**
             * Requested file path inside the package. (/some-module)
             * Used for packages that have multiple entry points or no mainModule specified in package.js.
             * E.g. `import { Something } from `meteor/ostrio:cookies/some-module`
             * @type {string | undefined}
             */
            importPath
        } = id.match(/(?<packageId>(meteor\/)[\w\-. ]+(:[\w\-. ]+)?)(?<importPath>\/.+)?/)?.groups || {};
        
        const packageName = packageId.replace(/^meteor\//, '');
        const sourceName = packageName.replace(':', '_');
        const sourceFile = `${sourceName}.js`;
        const sourcePath = Path.join(pluginSettings.meteorPackagePath, sourceFile);
        
        /**
         * Raw file content for the current file request.
         * We don't want to await it here to keep things snappy until the content is actually needed.
         *
         * @type {Promise<string>}
         */
        const content = FS.readFile(sourcePath, 'utf-8').catch((error: Error) => {
            throw new MeteorViteStubRequestError(`Unable to read file content: ${error.message}`)
        });
        
        return {
            content,
            packageId,
            importPath,
            sourcePath,
            manifestPath: Path.join('.meteor', 'local', 'isopacks', sourceName, 'web.browser.json')
        }
    }
    
    protected static async loadManifest({ file }: PreContextRequest & { file: FileData }) {
        if (!existsSync(file.manifestPath)) {
            return;
        }
        
        return JSON.parse(await FS.readFile(file.manifestPath, 'utf8'));
    }
    
}

interface PreContextRequest {
    id: string;
    pluginSettings: PluginSettings;
}

interface RequestContext extends PreContextRequest {
    manifest?: LoadRequestManifest;
    file: FileData;
}

type FileData = ReturnType<typeof ViteLoadRequest['loadFileData']>;
type LoadRequestManifest = ReturnType<typeof ViteLoadRequest['loadManifest']>;

interface ManifestContent {
    format: string;
    declaredExports: [];
    uses: { 'package': string }[];
    resources: ManifestResource[]
}

interface ManifestResource {
    path: string;
    fileOptions: { lazy: boolean; mainModule: boolean };
    extension: string;
    file: string;
    offset: number;
    length: number;
    type: string;
    hash: string
}

class MeteorViteError extends Error {
    constructor(message: string) {
        super(`⚡  ${message}`);
    }
}
class RefreshNeeded extends MeteorViteError {}
class MeteorViteStubRequestError extends MeteorViteError {}
