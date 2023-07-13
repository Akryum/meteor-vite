// Wait for Vite server to fire up before refreshing the client
// Todo: omit this module entirely in production build to save space

import { getConfig, RuntimeConfig, ViteConnection } from './loading/vite-connection-handler';
import { Meteor } from 'meteor/meteor';
import { Tracker } from 'meteor/tracker';

let subscription: Meteor.SubscriptionHandle;
let initialConfig: RuntimeConfig;

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
        console.info('⚡  Vite has already been loaded. Waiting on changes before refreshing.', { config });
        return;
    }
    
    // Todo: Load assets in the background before reloading to avoid staring at a blank screen for a while
    console.log('⚡  Refreshing client...');
    window.location.reload();
    return;
}

function onChange(config: RuntimeConfig) {
    console.info(
        '⚡  Meteor-Vite dev server details changed from %s to %s',
        buildConnectionUri(initialConfig),
        buildConnectionUri(config),
        { initialConfig, newConfig: config }
    );
    
    if (!config.ready) {
        console.log('⚡  Meteor-Vite dev server not ready yet. Waiting on server to become ready...');
        return;
    }
    
    if (hasLoadedVite()) {
        console.log('⚡  Attempting to refresh current Vite session to load new server config...')
        window.location.reload();
        return;
    }
    
    onReady(config);
}

function hasLoadedVite() {
    return !window.__METEOR_VITE_STARTUP__;
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
        
        if (!initialConfig) {
            return;
        }
        
        watchConfig(getConfig());
    })
});

declare global {
    interface Window {
        __METEOR_VITE_STARTUP__?: boolean;
    }
}

function buildConnectionUri(config: RuntimeConfig) {
    return `http://${config.host || 'localhost'}:${config.port}/`
}