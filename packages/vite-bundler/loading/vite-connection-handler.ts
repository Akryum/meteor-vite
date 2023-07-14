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
    publication: 'meteor:vite' as const,
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
    
    if (!MeteorViteConfig.findOne(ViteConnection.configSelector)) {
        MeteorViteConfig.insert(runtimeConfig);
        return runtimeConfig;
    }
    
    MeteorViteConfig.update(ViteConnection.configSelector, runtimeConfig);
    return runtimeConfig;
}

if (Meteor.isDevelopment) {
    MeteorViteConfig = new Mongo.Collection('meteor:vite');
    
    /**
     * Reset and refresh runtime config.
     */
    if (Meteor.isServer) {
        Meteor.startup(() => setConfig(runtimeConfig));
    }
    
}