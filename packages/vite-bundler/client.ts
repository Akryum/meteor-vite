// Wait for Vite server to fire up before refreshing the client
// Todo: omit this module entirely in production build to save space

import { getConfig, RuntimeConfig, ViteConnection } from './loading/vite-connection-handler';
import { Meteor } from 'meteor/meteor';
import { Tracker } from 'meteor/tracker';

let subscription: Meteor.SubscriptionHandle;
let initialConfig: RuntimeConfig;

function checkServer(config: RuntimeConfig) {
    if (initialConfig.host === config.host && initialConfig.port === config.port) {
        return;
    }
    
    console.info(
        '⚡  Meteor-Vite dev server details changed from %s to %s',
        buildConnectionUri(initialConfig),
        buildConnectionUri(config),
        { initialConfig, newConfig: config }
    );
    
    if (!config.ready) {
        console.log('⚡  Meteor-Vite dev server not ready yet. Waiting on server to become ready...');
    }
    
    if (window.__METEOR_VITE_STARTUP__) {
        // Todo: Load assets in the background before reloading to avoid staring at a blank screen for a while
        console.log('⚡  Refreshing client...');
        window.location.reload();
        return;
    }
    
    // todo: potentially trigger a refresh to clear out the old server config
    console.info('⚡  Not on startup screen. Letting the Vite server deal with this.', { config });
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
        
        checkServer(getConfig());
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