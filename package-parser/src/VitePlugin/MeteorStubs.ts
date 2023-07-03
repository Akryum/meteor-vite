import FS from 'fs/promises';
import Path from 'path';
import { Plugin } from 'vite';
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
            
            return createMeteorStub({ id, ...settings, });
        }
    }
}

async function createMeteorStub(context: StubContext) {
    const { packageId, fileContent } = parseFileId(context);
    const parserResult = parseModule({ fileContent });
    console.log(parserResult); // todo: yield template
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