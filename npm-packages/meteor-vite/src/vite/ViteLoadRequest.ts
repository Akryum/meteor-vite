import { existsSync } from 'fs';
import FS from 'fs/promises';
import Path from 'path';
import { isSameModulePath } from '../meteor/package/Serialize';
import { viteAutoImportBlock } from '../meteor/package/StubTemplate';
import type { PluginSettings } from './plugin/MeteorStubs';

export default class ViteLoadRequest {
    
    public static resolveId(id: string) {
        if (id.startsWith('meteor/')) {
            return `\0${id}`
        }
    }
    
    public static isStubRequest(id: string) {
        return id.startsWith('\0meteor/');}
    
    /**
     * Slice off the request raw request identifier we use for determining whether to process the request or not.
     *
     * @example
     * '\0meteor/meteor' -> 'meteor/meteor'
     */
    protected static getStubId(viteId: string) {
        return viteId.slice(1);
    }
    
    /**
     * Parse an incoming Vite plugin load() request.
     * Builds up the most of the metadata necessary for building up a good Meteor stub template.
     *
     * @param {PreContextRequest} request
     * @return {Promise<ViteLoadRequest>}
     */
    public static async prepareContext(request: PreContextRequest) {
        if (!this.isStubRequest(request.id)) {
            throw new MeteorViteStubRequestError('Tried to set up file context for an unrecognized file path!');
        }
        request.id = this.getStubId(request.id);
        const file = this.loadFileData(request);
        const manifest = await this.loadManifest({ file, ...request });
        
        return new ViteLoadRequest({
            file,
            manifest,
            ...request,
        })
    }
    protected static loadFileData({ id, pluginSettings }: PreContextRequest) {
        let {
            /**
             * Base Atmosphere package import This is usually where we find the full package content, even for packages
             * that have multiple entry points.
             * {@link ParsedPackage.packageId}
             */
            packageId,
            
            /**
             * Requested file path inside the package. (/some-module)
             * Used for packages that have multiple entry points or no mainModule specified in package.js.
             * E.g. `import { Something } from `meteor/ostrio:cookies/some-module`
             * @type {string | undefined}
             */
            importPath
        } = id.match( // todo: maybe use the Node.js Path utility?
            /(?<packageId>(meteor\/)[\w\-. ]+(:[\w\-. ]+)?)(?<importPath>\/.+)?/
        )?.groups || {} as { packageId: string, importPath?: string };
        
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
    
    /**
     * Checks Meteor for an Isopack manifest file.
     * We use this to detect whether a module is lazy-loaded and needs to be forcefully imported and for determining
     * the package's entrypoint.
     *
     * @param {FileData} file
     * @return {Promise<ManifestContent>}
     * @protected
     */
    protected static async loadManifest({ file }: PreContextRequest & { file: FileData }) {
        if (!existsSync(file.manifestPath)) {
            return;
        }
        
        return JSON.parse(await FS.readFile(file.manifestPath, 'utf8')) as ManifestContent;
    }
    
    public mainModulePath?: string;
    public isLazyLoaded: boolean;
    
    constructor(public readonly context: RequestContext ) {
        this.isLazyLoaded = false;
        
        context.manifest?.resources.forEach((resource) => {
            if (resource.fileOptions.mainModule) {
                this.mainModulePath = resource.path
            }
            if (isSameModulePath({
                filepathA: this.context.file.importPath || '',
                filepathB: resource.path,
                compareExtensions: false,
            })) {
                this.isLazyLoaded = resource.fileOptions.lazy;
            }
        })
    };
    
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
     * Relative path (for the current package) for the module to yield stubs for.
     *
     * @example formatting
     * this.context.id  // meteor/ostrio:cookies -> index.js (tries to detect mainModule)
     *
     * this.context.id // meteor/ostorio:cookies/some-file -> some-file.js
     * this.context.id // meteor/ostorio:cookies/dir/some-other-file -> dir/some-other-file.js
     */
    public get requestedModulePath() {
        if (!this.context.file.importPath) {
            return this.mainModulePath;
        }
        
        return this.context.file.importPath;
    }
    
    
    
}

/**
 * Load request file metadata. See linked method for documentation for the associated properties.
 * {@link ViteLoadRequest.loadFileData}
 */
export type FileRequestData = ReturnType<typeof ViteLoadRequest['loadFileData']>

interface PreContextRequest {
    id: string;
    pluginSettings: PluginSettings;
}

interface RequestContext extends PreContextRequest {
    manifest?: ManifestContent;
    file: FileData;
}

type FileData = ReturnType<typeof ViteLoadRequest['loadFileData']>;

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

export class MeteorViteError extends Error {
    public readonly viteId?: string;
    constructor(message: string, metadata?: {
        context?: Partial<RequestContext>;
        cause?: Error;
    }) {
        let messagePrefix = '';
        let messageSuffix = '';
        if (metadata?.context) {
            messagePrefix = `<${metadata.context.file?.packageId || metadata.context.id}> \n  `
        }
        if (metadata?.cause) {
            messageSuffix = `: ${metadata.cause.message}`
        }
        
        super(`${messagePrefix}⚡ ${message}${messageSuffix}`);
        
        if (metadata?.context) {
            this.viteId = metadata.context.id;
        }
        
        if (metadata?.cause) {
            const selfStack = this.splitStack(this.stack || '');
            const otherStack = this.splitStack(metadata.cause.stack || '')?.map((line) => `  ${line}`);
            this.stack = [selfStack[1], selfStack[2], '  Caused by:', ...otherStack].join('\n');
        }
    }
    
    private splitStack(stack: string) {
        return stack?.split(/[\n\r]+/);
    }
}
class RefreshNeeded extends MeteorViteError {}
class MeteorViteStubRequestError extends MeteorViteError {}
