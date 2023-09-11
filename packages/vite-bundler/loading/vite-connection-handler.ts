import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { WorkerResponseData } from '../../../npm-packages/meteor-vite/src/bin/worker';

export type RuntimeConfig = WorkerResponseData<'viteConfig'> & { ready: boolean, lastUpdate: number };
export let MeteorViteConfig: Mongo.Collection<RuntimeConfig>;

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
    info: (message: string, ...params: Parameters<typeof console.log>) => console.info(
        `${logLabel} ${message}`,
        ...params,
    ),
    error: (message: string, ...params: Parameters<typeof console.log>) => console.info(
        `${logLabel} ${message}`,
        ...params,
    ),
};