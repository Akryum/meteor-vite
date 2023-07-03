import { existsSync } from 'fs';
import FS from 'fs/promises';
import Path from 'path';
import { Plugin } from 'vite';
import { ModuleExport, parseModule, ParserResult } from '../Parser';
import { getMainModule, getModuleFromPath } from '../util/Serialize';
import { stubTemplate, viteAutoImportBlock } from './StubTemplate';


export function MeteorViteStubs(settings: PluginSettings): Plugin {
    return {
        name: 'meteor-vite: stubs',
        resolveId (id) {
            if (id.startsWith('meteor/')) {
                return `\0${id}`
            }
        },
        load(id) {
            if (!id.startsWith('\0meteor/')) {
                return;
            }
            const context = { id: id.slice(1), ...settings }
            const file = loadFileData(context);
            
            return createMeteorStub({ file, ...context, }).catch((error) => {
                console.error('Encountered an error while package "%s" at path: %s!', file.packageId, file.sourcePath);
                throw error;
            });
        }
    }
}

// todo: Handle isopack auto-imports
async function createMeteorStub(context: StubContext) {
    const { file } = context;
    await checkManifest(context);
    const parserResult = await parseModule({ fileContent: file.content })
    let requestedModule: ModuleExport[] = getMainModule(parserResult) || [];
    
    if (file.importPath) {
        requestedModule = getModuleFromPath({ result: parserResult, importPath: file.importPath }).modules;
    }
    
    const template = stubTemplate({
        stubId: stubId++,
        packageId: file.packageId,
        moduleExports: requestedModule,
        packageScopeExports: parserResult.packageScopeExports,
    });
    
    console.log(`${file.packageId}: ${parserResult.timeSpent}`);
    
    return template;
}

function loadFileData({ id, meteorPackagePath }: Pick<StubContext, 'id' | 'meteorPackagePath'>) {
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
    const sourcePath = Path.join(meteorPackagePath, sourceFile);
    const content = FS.readFile(sourcePath, 'utf-8');
    return {
        content,
        packageId,
        importPath,
        sourcePath,
        manifestPath: Path.join('.meteor', 'local', 'isopacks', sourceName, 'web.browser.json')
    }
}

type ManifestContent = {
    resources: {
        path: string;
        fileOptions: { lazy: boolean; mainModule: boolean };
        extension: string;
        file: string;
        offset: number;
        length: number;
        type: string;
        hash: string
    }[]
}

type ProjectJson = {
    meteor: {
        mainModule: {
            client: string
        }
    }
}

async function checkManifest({ id, file, projectJsonContent: projectJson }: StubContext) {
    if (!existsSync(file.manifestPath) || !projectJson) {
        return;
    }
    
    async function autoImport() {
        if (!projectJson.meteor?.mainModule?.client) {
            throw new Error(`⚡  No meteor.mainModule.client found in package.json`)
        }
        const meteorClientEntryFile = Path.resolve(process.cwd(), projectJson.meteor.mainModule.client)
        if (!existsSync(meteorClientEntryFile)) {
            throw new Error(`⚡  meteor.mainModule.client file not found: ${meteorClientEntryFile}`)
        }
        const content = await FS.readFile(meteorClientEntryFile, 'utf8')
        if (!content.includes(`'${id}'`)) {
            await FS.writeFile(meteorClientEntryFile, viteAutoImportBlock({ content, id }));
            throw new Error(`⚡  Auto-imported package ${id} to ${meteorClientEntryFile}, please reload`)
        }
    }
    
    const manifest: ManifestContent = JSON.parse(await FS.readFile(file.manifestPath, 'utf8'));
    let mainModule;
    const resources = manifest.resources.filter((resource) => {
        if (resource.fileOptions.mainModule) {
            mainModule = resource;
            return true;
        }
        if (file.importPath) {
            return resource.file.includes(file.importPath);
        }
    });
    
    await Promise.all(resources.map(async (resource) => {
        if (resource.fileOptions.lazy) {
            await autoImport();
        }
    }))
    
    return {
        mainModule,
    }
}


/**
 * Unique ID for the next stub.
 * @type {number}
 */
let stubId = 0;

interface PluginSettings {
    /**
     * Path to Meteor's internal package cache.
     *
     * @example
     * .meteor/local/build/programs/web.browser/packages
     */
    meteorPackagePath: string;
    
    /**
     * Full content of the Meteor project's package.json.
     */
    projectJsonContent: ProjectJson;
}

interface StubContext extends PluginSettings {
    /**
     * vite file ID. This is usually a relative or absolute file path.
     */
    id: string;
    file: ReturnType<typeof loadFileData>
}