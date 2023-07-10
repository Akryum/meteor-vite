// Wait for Vite server to fire up before refreshing the client
// Todo: omit this module entirely in production build to save space

import { getConfig, RuntimeConfig, ViteConnection } from './loading/vite-connection-handler';
import { Meteor } from 'meteor/meteor';
import { Tracker } from 'meteor/tracker';

declare global {
    interface Window {
        __METEOR_VITE_STARTUP__?: boolean;
    }
}


if (Meteor.isDevelopment) {
    let initialConfig: RuntimeConfig;
    Meteor.subscribe(ViteConnection.publication, function() {
        if (this.ready) {
            initialConfig = getConfig();
        }
    });
    
    Tracker.autorun(function() {
        const viteConfig = getConfig();
        
        if (!initialConfig) {
            return;
        }
        
        if (initialConfig.port !== viteConfig.port) {
            console.log('Vite server port changed! Reloading client...', { initialConfig, viteConfig });
            window.location.reload();
        }
        
        if (initialConfig.host !== viteConfig.host) {
            console.log('Vite server host changed! Reloading client...', { initialConfig, viteConfig });
            window.location.reload();
        }
        
        // Skip reloading if we're already in the app
        if (window.__METEOR_VITE_STARTUP__ !== true) {
            return;
        }
        
        if (viteConfig) {
            console.log('Received Vite configuration', viteConfig)
        }
        
        if (viteConfig.ready) {
            console.log('Vite server ready! Reloading client...');
            // Todo: Load assets in the background before reloading to avoid staring at a blank screen for a while
            window.location.reload();
            return;
        }
        
        console.log('Waiting on Vite server...', { viteConfig });
    });
}