// Wait for Vite server to fire up before refreshing the client
// Todo: omit this module entirely in production build to save space

import { getConfig, ViteConnection } from './loading/vite-connection-handler';
import { Meteor } from 'meteor/meteor';
import { Tracker } from 'meteor/tracker';


if (Meteor.isDevelopment) {
    Tracker.autorun(function() {
        const viteConfig = getConfig();
        Meteor.subscribe(ViteConnection.publication, function() {
            if (this.ready) {
                console.log('Received Vite configuration', getConfig());
            }
        });
        
        if (viteConfig.ready) {
            console.log('Vite server ready! Reloading client...');
            window.location.reload();
            return;
        }
        
        console.log('Waiting on Vite server...', { viteConfig });
    })
}