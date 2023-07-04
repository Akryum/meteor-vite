import { Plugin } from 'vite';
import { parseModule } from '../Parser';
import { getModuleFromPath } from '../util/Serialize';
import { stubTemplate } from './StubTemplate';
import ViteLoadRequest from './ViteLoadRequest';

/**
 * Unique ID for the next stub.
 * @type {number}
 */
let stubId = 0;

export function MeteorViteStubs(pluginSettings: PluginSettings): Plugin {
    return {
        name: 'meteor-vite: stubs',
        resolveId: (id) => ViteLoadRequest.resolveId(id),
        async load(viteId) {
            if (!ViteLoadRequest.isStubRequest(viteId)) {
                return;
            }
            const timeStarted = Date.now();
            const id = ViteLoadRequest.getStubId(viteId);
            const request = await ViteLoadRequest.prepareContext({ id, pluginSettings })
            const parserResult = await parseModule({ fileContent: request.context.file.content });
            const module = getModuleFromPath({
                importPath: request.requestedModulePath(),
                result: parserResult, // todo: rename key to parserResult
            }).modules; // todo: refactor .modules to .exports
            const template = stubTemplate({
                stubId: stubId++,
                packageId: request.context.file.packageId,
                moduleExports: module,
                packageScopeExports: parserResult.packageScopeExports,
            })
            
            console.log(`${request.context.file.packageId}: %o`, {
                parse: parserResult.timeSpent,
                overall: `${Date.now() - timeStarted}ms`,
            })
            
            // todo: detect lazy-loaded package and perform auto-import
            
           return template;
        }
    }
}


export interface PluginSettings {
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

/**
 * The user's Meteor project package.json content.
 * todo: expand types
 */
type ProjectJson = {
    meteor: {
        mainModule: {
            client: string
        }
    }
}
