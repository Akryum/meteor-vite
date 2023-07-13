import { ResolvedConfig } from 'vite';

export declare interface MeteorViteConfig extends ResolvedConfig {
    meteor?: {
        /**
         * Vite client entry into Meteor.
         * Not to be confused with your Meteor mainModule.
         *
         * {@link https://github.com/JorgenVatle/meteor-vite#readme}
         */
        clientEntry?: string;
        
        /**
         * Settings for controlling how stubs created by Meteor-Vite are validated.
         * These settings only apply in a development environment. Once the app is bundled for production, runtime
         * stub validation is disabled.
         */
        stubValidation?: StubValidationSettings;
    };
}

export interface StubValidationSettings {
    /**
     * list of packages to ignore export validation for.
     */
    ignorePackages?: string[];
    
    /**
     * Will only emit warnings in the console instead of throwing an exception that may prevent the client app
     * from loading.
     * @default false
     */
    warnOnly?: boolean;
    
    /**
     * Whether to use runtime stub validation in production.
     * This can be useful if you use a tool for collecting error logs from your users where you'll be
     * notified if something were to go wrong with the Vite build.
     * @default false
     */
    inProduction?: boolean;
}