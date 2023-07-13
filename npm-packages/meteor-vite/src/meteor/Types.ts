export interface MeteorSettings {
    public?: PluginSettings;
}

interface PluginSettings {
    'vite:bundler'?: {
        /**
         * Settings for controlling how stubs created by Meteor-Vite are validated.
         * These settings only apply in a development environment. Once the app is bundled for production, runtime
         * stub validation is disabled.
         */
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
