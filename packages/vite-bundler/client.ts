// Wait for Vite server to fire up before refreshing the client
// Todo: omit this module entirely in production build to save space

import { Meteor } from 'meteor/meteor';
import { Tracker } from 'meteor/tracker';
import {
    getConfig,
    DevConnectionLog,
    RuntimeConfig,
    ViteConnection,
    VITE_DEV_SCRIPT_ID, ViteDevScript,
} from './loading/vite-connection-handler';

let subscription: Meteor.SubscriptionHandle;
let initialConfig: RuntimeConfig;
const TemporaryElements = {
    splashScreen: document.getElementById('meteor-vite-splash-screen');
    styles: document.getElementById('meteor-vite-styles');
}

function watchConfig(config: RuntimeConfig) {
    if (initialConfig.host !== config.host) {
        return onChange(config);
    }
    
    if (initialConfig.ready !== config.ready) {
        return onChange(config);
    }
    
    if (initialConfig.port !== config.port) {
        return onChange(config);
    }
    
    if (config.ready) {
        return onReady(config);
    }
}

function onReady(config: RuntimeConfig) {
    if (hasLoadedVite()) {
        DevConnectionLog.info('Vite has already been loaded. Waiting on changes before refreshing.', { config });
        return;
    }
    
    const viteEntrypoint = ViteDevScript(config);
    
    if (typeof viteEntrypoint === 'string') {
        throw new Error('Vite dev script yielded a string. Is this running on the server?');
    }
    
    viteEntrypoint.onerror = (error) => {
        DevConnectionLog.error('Vite entrypoint module failed to load! Will refresh page shortly...', error);
        setTimeout(() => window.location.reload(), 15_000);
    }
    viteEntrypoint.onload = () => {
        DevConnectionLog.info('Loaded Vite module dynamically! Hopefully all went well and your app is usable. 🤞');
        TemporaryElements.splashScreen?.remove()
        TemporaryElements.styles?.remove();
    }
    
    document.body.prepend(viteEntrypoint);
    return;
}

function onChange(config: RuntimeConfig) {
    DevConnectionLog.info(
        'Meteor-Vite dev server details changed from %s to %s',
        buildConnectionUri(initialConfig),
        buildConnectionUri(config),
        { initialConfig, newConfig: config }
    );
    
    if (!config.ready) {
        DevConnectionLog.info('Meteor-Vite dev server not ready yet. Waiting on server to become ready...');
        return;
    }
    
    if (hasLoadedVite()) {
        DevConnectionLog.info('Attempting to refresh current Vite session to load new server config...')
        setTimeout(() => window.location.reload(), 1_000);
        return;
    }
    
    onReady(config);
}

function hasLoadedVite() {
    return !!document.getElementById(VITE_DEV_SCRIPT_ID);
}

Meteor.startup(() => {
    if (!Meteor.isDevelopment) {
        return;
    }
    
    Tracker.autorun(function() {
        subscription = Meteor.subscribe(ViteConnection.publication);
        const config = getConfig();
        if (!initialConfig && subscription.ready()) {
            initialConfig = config;
        }
        
        DevConnectionLog.debug('Vite connection config changed', config);
        
        if (!initialConfig) {
            return;
        }
        
        watchConfig(getConfig());
    });
    
    if (!hasLoadedVite()) {
        forceConfigRefresh();
    }
});

/**
 * Failsafe to force a refresh of the server's runtime config.
 */
function forceConfigRefresh() {
    const forceRefreshAfter = 5 * 1000 // 5 seconds
    const interval = Meteor.setInterval(() => {
        const lastUpdateMs = Date.now() - getConfig().lastUpdate;
        if (lastUpdateMs < forceRefreshAfter) {
            return;
        }
        if (hasLoadedVite()) {
            Meteor.clearInterval(interval);
            return;
        }
        Meteor.call(ViteConnection.methods.refreshConfig, (error?: Error, config?: RuntimeConfig) => {
            if (error) {
                throw error;
            }
            if (!config) {
                console.error('Received no config from server!', { error, config })
            }
            watchConfig(config || getConfig());
        })
    }, 2500);
}

declare global {
    interface Window {
        __METEOR_VITE_STARTUP__?: boolean;
    }
}

function buildConnectionUri(config: RuntimeConfig) {
    return `http://${config.host || 'localhost'}:${config.port}/`
}