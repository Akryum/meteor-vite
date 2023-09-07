import { existsSync } from 'fs';
import FS from 'fs/promises';
import NodeFS from 'fs';
import Path from 'path';
import pc from 'picocolors';
import { createLabelledLogger, LabelLogger } from '../Logger';
import { isSameModulePath } from '../meteor/package/components/MeteorPackage';
import AutoImportQueue from './AutoImportQueue';
import { MeteorViteError } from './error/MeteorViteError';
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
        const sourcePath = Path.join(pluginSettings.meteor.packagePath, sourceFile);
        const resolverResultCache: ResolverResultCache = JSON.parse(NodeFS.readFileSync(Path.join(pluginSettings.meteor.isopackPath, '../resolver-result-cache.json'), 'utf-8'));
        const packageVersion = resolverResultCache.lastOutput.answer[packageName];
        
        const manifestPath = {
            local: Path.join(pluginSettings.meteor.isopackPath, sourceName, 'web.browser.json'),
            globalCache: Path.join(pluginSettings.meteor.globalMeteorPackagesDir, sourceName, packageVersion, 'web.browser.json'),
        }
        
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
            manifestPath: NodeFS.existsSync(manifestPath.local)
                          ? manifestPath.local
                          : manifestPath.globalCache,
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
    public log: LabelLogger;
    
    constructor(public readonly context: RequestContext ) {
        this.isLazyLoaded = false;
        this.log = createLabelledLogger(`[${pc.yellow(context.id.replace('meteor/', ''))}]`);
        
        context.manifest?.resources.forEach((resource) => {
            const isMainModule = resource.fileOptions?.mainModule;
            if (isMainModule) {
                this.mainModulePath = resource.path
            }
            if (!this.context.file.importPath && isMainModule) {
                this.isLazyLoaded = resource.fileOptions?.lazy || false;
            }
            if (isSameModulePath({
                filepathA: this.context.file.importPath || '',
                filepathB: resource.path,
                compareExtensions: false,
            })) {
                this.isLazyLoaded = resource.fileOptions?.lazy || false;
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
        const mainModule = this.context.pluginSettings.packageJson.meteor.mainModule;
        const meteorClientEntryFile = Path.resolve(process.cwd(), mainModule.client);
        
        if (!existsSync(meteorClientEntryFile)) {
            throw new MeteorViteError(`meteor.mainModule.client file not found: ${meteorClientEntryFile}`)
        }
        
        await AutoImportQueue.write({
            meteorEntrypoint: meteorClientEntryFile,
            importString: this.context.id,
        });
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

export interface RequestContext extends PreContextRequest {
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
    fileOptions?: { lazy: boolean; mainModule: boolean };
    extension: string;
    file: string;
    offset: number;
    length: number;
    type: string;
    hash: string
}

type VersionString = `${string}.${string}.${string}`;

interface ResolverResultCache {
    lastInput: {
        dependencies: string[],
        constraints: `${string}@${VersionString}`[],
        previousSolution: Record<string, VersionString>;
    },
    lastOutput: {
        neededToUseUnanticipatedPrereleases: boolean;
        answer: Record<string, VersionString>;
    }
    
}

export class RefreshNeeded extends MeteorViteError {
    constructor(message: string, public readonly loadedPackages: string[]) {
        super(message);
    }
}
class MeteorViteStubRequestError extends MeteorViteError {}
