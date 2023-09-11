import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { WorkerResponseData } from '../../../npm-packages/meteor-vite/src/bin/worker';

export type RuntimeConfig = WorkerResponseData<'viteConfig'> & { ready: boolean, lastUpdate: number };
export let MeteorViteConfig: Mongo.Collection<RuntimeConfig>;
export const VITE_DEV_SCRIPT_ID = 'meteor-vite-script';
export function ViteDevScript(config: RuntimeConfig) {
    const url = `http://${config.host || 'localhost'}:${config.port}/${config.entryFile}`;
    
    // Return the script in plain text for the server to serve directly to the client, speeding things up a little.
    if (Meteor.isServer) {
        return `<script src="${url}" type="module" id="${VITE_DEV_SCRIPT_ID}"></script>`
    }
    
    // If the script already exists on the page, throw an error to prevent adding more than one script.
    const existingScript = document.getElementById(VITE_DEV_SCRIPT_ID);
    if (existingScript) {
        throw new Error('Vite script already exists in the current document');
    }
    
    // Otherwise create a new one so that it can be appended to the document.
    const script = document.createElement('script');
    script.id = VITE_DEV_SCRIPT_ID;
    script.src = url;
    script.type = 'module';
    script.setAttribute('defer', 'true');
    
    return script;
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