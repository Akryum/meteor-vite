export interface MeteorSettings extends PluginSettings {
    /**
     * In the development environment, the Meteor-Vite plugin settings will be exposed under public settings.
     * For production, we skip this step.
     */
    public?: PluginSettings;
}

interface PluginSettings {
    'vite:bundler'?: {
        stubValidation?: {
            /**
             * list of packages to ignore export validation for.
             */
            ignorePackages?: string[];
            
            /**
             * Will only emit warnings in the console instead of throwing an exception that may prevent the client app
             * from loading.
             */
            warnOnly?: boolean;
        };
    }
}
