import { existsSync } from 'fs';
import FS from 'fs/promises';
import Path from 'path';
import { PluginSettings } from './MeteorViteStubs';

export default class ViteLoadRequest {
    
    public static async prepareContext(request: PreContextRequest) {
        const file = this.loadFileData(request);
        const manifest = await this.loadManifest({ file, ...request });
        
        return new ViteLoadRequest({
            file,
            manifest,
            ...request,
        })
    }
    
    constructor(public readonly context: RequestContext ) {};
    
    
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
        const content = FS.readFile(sourcePath, 'utf-8');
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