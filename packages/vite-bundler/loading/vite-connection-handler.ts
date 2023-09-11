import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { WorkerResponseData } from '../../../npm-packages/meteor-vite/src/bin/worker';

export type RuntimeConfig = WorkerResponseData<'viteConfig'> & { ready: boolean, lastUpdate: number };
export let MeteorViteConfig: Mongo.Collection<RuntimeConfig>;
export const VITE_ENTRYPOINT_SCRIPT_ID = 'meteor-vite-entrypoint-script';
export const VITE_CLIENT_SCRIPT_ID = 'meteor-vite-client';
export class ViteDevScripts {
    public readonly urls;
    constructor(public readonly config: RuntimeConfig) {
        const baseUrl = `http://${config.host || 'localhost'}:${config.port}`;
        this.urls = {
            baseUrl,
            entrypointUrl: `${baseUrl}/${config.entryFile}`,
            viteClientUrl: `${baseUrl}/@vite/client`,
        }
    }
    
    public stringTemplate() {
        const { viteClientUrl, entrypointUrl } = this.urls;
        const viteClient = `<script src="${viteClientUrl}" type="module" id="${VITE_CLIENT_SCRIPT_ID}"></script>`;
        const viteEntrypoint = `<script src="${entrypointUrl}" type="module" id="${VITE_ENTRYPOINT_SCRIPT_ID}"></script>`;
        
        if (this.config.ready) {
            return `${viteClient}\n${viteEntrypoint}`;
        }
        
        return Assets.getText('loading/dev-server-splash.html') as string;
    }
    
    public injectScriptsInDOM() {
        if (Meteor.isServer) {
            throw new Error('This can only run on the client!');
        }
        if (!Meteor.isDevelopment) {
            return;
        }
        
        // If the scripts already exists on the page, throw an error to prevent adding more than one script.
        const existingScript = document.getElementById(VITE_ENTRYPOINT_SCRIPT_ID) || document.getElementById(VITE_CLIENT_SCRIPT_ID);
        if (existingScript) {
            throw new Error('Vite script already exists in the current document');
        }
        
        const TemporaryElements = {
            splashScreen: document.getElementById('meteor-vite-splash-screen'),
            styles: document.getElementById('meteor-vite-styles'),
        }
        
        // Otherwise create a new set of nodes so they can be appended to the document.
        const viteEntrypoint = document.createElement('script');
        viteEntrypoint.id = VITE_ENTRYPOINT_SCRIPT_ID;
        viteEntrypoint.src = this.urls.entrypointUrl;
        viteEntrypoint.type = 'module';
        viteEntrypoint.setAttribute('defer', 'true');
        
        const viteClient = document.createElement('script');
        viteClient.id = VITE_CLIENT_SCRIPT_ID;
        viteClient.src = this.urls.viteClientUrl;
        viteClient.type = 'module';
        
        viteEntrypoint.onerror = (error) => {
            DevConnectionLog.error('Vite entrypoint module failed to load! Will refresh page shortly...', error);
            setTimeout(() => window.location.reload(), 15_000);
        }
        viteEntrypoint.onload = () => {
            DevConnectionLog.info('Loaded Vite module dynamically! Hopefully all went well and your app is usable. 🤞');
            TemporaryElements.splashScreen?.remove()
            TemporaryElements.styles?.remove();
        }
        
        document.body.prepend(viteEntrypoint, viteClient);
    }
}

const runtimeConfig: RuntimeConfig = {
    ready: false,
    host: 'localhost',
    port: 0,
    entryFile: '',
    lastUpdate: Date.now(),
}

export const ViteConnection = {
    publication: '_meteor_vite' as const,
    methods: {
        refreshConfig: '_meteor_vite_refresh_config',
    },
    configSelector: { _id: 'viteConfig' },
}

export function getConfig() {
    const viteConfig = MeteorViteConfig.findOne(ViteConnection.configSelector);
    const config = viteConfig || runtimeConfig;
    return {
        ...config,
        age: Date.now() - config.lastUpdate,
    }
}

export function setConfig<TConfig extends Partial<RuntimeConfig>>(config: TConfig) {
    Object.assign(runtimeConfig, config, ViteConnection.configSelector, { lastUpdate: Date.now() });
    
    if (runtimeConfig.port && runtimeConfig.host && runtimeConfig.entryFile) {
        runtimeConfig.ready = true;
    }
    
    MeteorViteConfig.upsert(ViteConnection.configSelector, runtimeConfig);
    return runtimeConfig;
}

if (Meteor.isDevelopment) {
    MeteorViteConfig = new Mongo.Collection(ViteConnection.publication);
}
const logLabel = Meteor.isClient ? `[Meteor-Vite] ⚡ ` : '⚡  ';

export const DevConnectionLog = {
    _logToScreen(message: string) {
        if (!Meteor.isClient) return;
        const messageNode = document.createElement('div');
        messageNode.innerText = message;
        document.querySelector('.vite-status-text')?.prepend(messageNode);
    },
    info: (message: string, ...params: Parameters<typeof console.log>) => {
        DevConnectionLog._logToScreen(` ⚡ ${message}`);
        console.info(
            `${logLabel} ${message}`,
            ...params,
        )
    },
    debug: (message: string, ...params: Parameters<typeof console.log>) => {
        DevConnectionLog._logToScreen(` ⚡ ${message}`);
        console.debug(
            `${logLabel} ${message}`,
            ...params,
        )
    },
    error: (message: string, ...params: Parameters<typeof console.log>) => {
        for (const param of params) {
            if (param instanceof Error && param.stack) {
                DevConnectionLog._logToScreen(param.stack);
            }
        }
        DevConnectionLog._logToScreen(` ⚡ ${message}`);
        console.error(
            `${logLabel} ${message}`,
            ...params,
        )
    },
};