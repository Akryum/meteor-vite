import FS from 'fs/promises';
import Path from 'path';
import pc from 'picocolors';
import { Plugin } from 'vite';
import PackageJSON from '../../../package.json';
import { DeepPartial } from '../../HelperTypes';
import MeteorPackage from '../../meteor/package/MeteorPackage';
import { stubTemplate } from '../../meteor/package/StubTemplate';
import { createErrorHandler } from '../error/ErrorHandler';
import { MeteorViteError } from '../error/MeteorViteError';
import { StubValidationSettings } from '../MeteorViteConfig';
import ViteLoadRequest from '../ViteLoadRequest';

export const MeteorStubs = setupPlugin(async (pluginSettings: PluginSettings) => {
    return {
        name: 'meteor-vite: stubs',
        resolveId: (id) => ViteLoadRequest.resolveId(id),
        shouldProcess: (viteId) => ViteLoadRequest.isStubRequest(viteId),
        async setupContext(viteId) {
            return ViteLoadRequest.prepareContext({ id: viteId, pluginSettings });
        },
        
        async load(request) {
            const timeStarted = Date.now();
            
            if (!pluginSettings?.packageJson?.meteor?.mainModule?.client || true) {
                throw new MeteorViteError(`You need to specify a Meteor entrypoint in your package.json!`, {
                    subtitle: `See the following link for more info: ${PackageJSON.homepage}`
                })
            }
            
            if (request.isLazyLoaded) {
                await request.forceImport();
            }
            
            const meteorPackage = await MeteorPackage.parse({
                filePath: request.context.file.sourcePath,
                fileContent: request.context.file.content,
            });
            
            const template = stubTemplate({
                requestId: request.context.id,
                submodule: meteorPackage.getModule({ importPath: request.requestedModulePath }),
                meteorPackage,
                stubValidation: pluginSettings.stubValidation,
            })
            
            request.log.debug(`Meteor stub created`, {
                'Parse time': meteorPackage.meta.timeSpent,
                'Request duration': `${Date.now() - timeStarted}ms`,
            });
            
            if (pluginSettings.debug) {
                await storeDebugSnippet({ request, stubTemplate: template })
            }
            
            return template;
        },
    }
})

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
    
    request.log.info('Stored debug snippets', {
        File: pc.cyan(baseDir),
    })
}

/**
 * Vite plugin options wrapper.
 * Just a utility to set up catch blocks for nicer error handling as well as pre-populating the load() handler with
 * the request context from {@link ViteLoadRequest}.
 */
function setupPlugin<Context extends ViteLoadRequest, Settings>(setup: (settings: Settings) => Promise<{
    name: string;
    load(request: Context): Promise<string>;
    setupContext(viteId: string): Promise<Context>;
    shouldProcess(viteId: string): boolean;
    resolveId(viteId: string): string | undefined;
}>): (settings: Settings) => Promise<Plugin> {
    const createPlugin = async (settings: Settings) => {
        const plugin = await setup(settings);
        return {
            name: plugin.name,
            resolveId: plugin.resolveId,
            load: async (viteId: string) => {
                const shouldProcess = plugin.shouldProcess(viteId);
                
                if (!shouldProcess) {
                    return;
                }
                
                const request = await plugin.setupContext(viteId);
                
                return plugin.load(request).catch(
                    createErrorHandler('Could not parse Meteor package', request)
                )
            },
        }
    }
    
    return (settings: Settings) => createPlugin(settings).catch(createErrorHandler('Could not set up Vite plugin!'))
}


export interface PluginSettings {
    
    meteor: {
        /**
         * Path to Meteor's internal package cache.
         * This can change independently of the isopack path depending on whether we're building for production or
         * serving up the dev server.
         *
         * @example {@link /examples/vue/.meteor/local/build/programs/web.browser/packages}
         */
        packagePath: string;
        
        /**
         * Path to Meteor's Isopacks store. Used to determine where a package's mainModule is located and whether
         * the package has lazy-loaded modules. During production builds this would be pulled from a temporary
         * Meteor build, so that we have solid metadata to use when creating Meteor package stubs.
         *
         * @example {@link /examples/vue/.meteor/local/isopacks/}
         */
        isopackPath: string;
    }
    
    /**
     * Configuration for how stubs generated by Meteor-Vite should be validated. The intent is to warn users early
     * in case there is something wrong with the way Meteor-Vite parses Meteor packages.
     * {@link StubValidationSettings}
     */
    stubValidation?: StubValidationSettings;
    
    /**
     * Full content of the user's Meteor project package.json.
     * Like the one found in {@link /examples/vue/package.json}
     */
    packageJson: ProjectJson;
    
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
export type ProjectJson = DeepPartial<ValidProjectJson>
export type ValidProjectJson = {
    meteor: {
        mainModule: {
            client: string;
        },
        viteConfig?: string;
    }
}
