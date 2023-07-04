import { Plugin } from 'vite';
import { ModuleExport, parseModule } from '../Parser';
import { getModuleExports } from '../util/Serialize';
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
            const request = await ViteLoadRequest.prepareContext({ id: viteId, pluginSettings })
            const parserResult = await parseModule({ fileContent: request.context.file.content });
            let moduleExports: ModuleExport[] = [];
            
            if (request.requestedModulePath) {
                moduleExports = getModuleExports({
                    importPath: request.requestedModulePath,
                    parserResult,
                }).exports;
            } else { // fall back to the first parsed module in the list
                moduleExports = parserResult.modules[0] || [];
            }
            
            const template = stubTemplate({
                stubId: stubId++,
                packageId: request.context.file.packageId,
                moduleExports,
                packageScopeExports: parserResult.packageScopeExports,
            })
            
            console.log(`${request.context.file.packageId}:`, {
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
