import FS from 'fs/promises';
import Path from 'path';
import { Plugin } from 'vite';
import { ModuleExport, parseModule, ParserResult } from '../Parser';
import { getMainModule, getModuleFromPath } from '../util/Serialize';
import { stubTemplate } from './StubTemplate';


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
async function createMeteorStub({ file }: StubContext) {
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
    projectJsonContent: string;
}

interface StubContext extends PluginSettings {
    /**
     * vite file ID. This is usually a relative or absolute file path.
     */
    id: string;
    file: ReturnType<typeof loadFileData>
}