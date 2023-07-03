import FS from 'fs/promises';
import Path from 'path';
import { Plugin } from 'vite';
import { stubTemplate } from '../MeteorStub';
import { parseModule } from '../Parser';

export function MeteorStubs(settings: PluginSettings): Plugin {
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
            
            id = id.slice(1);
            
            return createMeteorStub({ id, ...settings, }).catch((error) => {
                console.error('Encountered an error while parsing file: %s!', id);
                throw error;
            });
        }
    }
}

/**
 * Unique ID for the next stub.
 * @type {number}
 */
let stubId = 0;

async function createMeteorStub(context: StubContext) {
    const { packageId, fileContent } = parseFileId(context);
    const parserResult = await parseModule({ fileContent });
    const template = stubTemplate({
        stubId: stubId++,
        packageId,
        // todo: 1 Detect requested module from request ID.
        // todo: 2 Detect mainModule from file source.
        moduleExports: parserResult.modules[0],
        packageScopeExports: parserResult.packageScopeExports,
    });
    
    console.log(parserResult);
    
    return template;
}

function parseFileId({ id, meteorPackagePath }: StubContext) {
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
    const fileContent = FS.readFile(sourcePath, 'utf-8');
    
    return {
        packageId,
        fileContent,
        importPath,
    }
}

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
     * Vite file ID. This is usually a relative or absolute file path.
     */
    id: string;
}