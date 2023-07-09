import FS from 'fs/promises';
import Path from 'path';
import { Plugin } from 'vite';
import { parseMeteorPackage } from '../../meteor/package/Parser';
import { stubTemplate } from '../../meteor/package/StubTemplate';
import ViteLoadRequest, { MeteorViteError } from '../ViteLoadRequest';

/**
 * Unique ID for the next stub.
 * @type {number}
 */
let stubId = 0;

export function MeteorStubs(pluginSettings: PluginSettings): Plugin {
    return {
        name: 'meteor-vite: stubs',
        resolveId: (id) => ViteLoadRequest.resolveId(id),
        async load(viteId) {
            if (!ViteLoadRequest.isStubRequest(viteId)) {
                return;
            }
            const timeStarted = Date.now();
            const request = await ViteLoadRequest.prepareContext({ id: viteId, pluginSettings })
            const meteorPackage = await parseMeteorPackage({ fileContent: request.context.file.content }).catch((error) => {
                throw new MeteorViteError(`Unable to parse package`, { cause: error, context: request.context });
            });
            
            const { modulePath, exports } = meteorPackage.getExports({
                importPath: request.requestedModulePath
            })
            
            
            const template = stubTemplate({
                stubId: stubId++,
                packageId: request.context.file.packageId,
                requestId: request.context.id,
                module: {
                    exports,
                    modulePath,
                    importPath: `${request.context.file.packageId}${modulePath ? `/${modulePath}` : ''}`,
                    packageExports: meteorPackage.packageScopeExports,
                },
            })
            
            console.log(`${request.context.file.packageId}:`, {
                parse: meteorPackage.meta.timeSpent,
                overall: `${Date.now() - timeStarted}ms`,
            });
            
            if (pluginSettings.debug) {
                await storeDebugSnippet({ request, stubTemplate: template })
            }
            
            // todo: detect lazy-loaded package and perform auto-import
            
           return template;
        }
    }
}

async function storeDebugSnippet({ request, stubTemplate }: {
    request: ViteLoadRequest,
    stubTemplate: string
}) {
    const baseDir = Path.join(process.cwd(), '.meteor-vite', request.context.file.packageId.replace(':', '_'));
    const templatePath = Path.join(baseDir, request.context.file.importPath || '', 'template.js');
    const packagePath = Path.join(baseDir, 'package.js');
    
    await FS.mkdir(Path.dirname(templatePath), { recursive: true });
    
    await Promise.all([
        FS.writeFile(templatePath, stubTemplate),
        FS.writeFile(packagePath, await request.context.file.content),
    ]);
    
    console.log('Stored debug snippets for package %s in %s', request.context.id, baseDir)
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
    
    /**
     * Enabling debug mode will write all input and output files to a `.meteor-vite` directory.
     * Handy for quickly assessing how things are being formatted, or for writing up new test sources.
     */
    debug?: boolean;
    
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
