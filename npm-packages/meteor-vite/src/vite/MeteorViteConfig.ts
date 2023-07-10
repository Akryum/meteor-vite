import { ResolvedConfig } from 'vite';

export declare interface MeteorViteConfig extends ResolvedConfig {
    meteor?: {
        /**
         * Vite client entry into Meteor.
         * Not to be confused with your Meteor mainModule.
         *
         * {@link https://github.com/JorgenVatle/meteor-vite/blob/main/packages/vite-bundler/README.md}
         */
        clientEntry?: string;
    };
}