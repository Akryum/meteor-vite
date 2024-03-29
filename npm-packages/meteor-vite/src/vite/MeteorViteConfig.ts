import type { ResolvedConfig } from 'vite'

export declare interface MeteorViteConfig extends ResolvedConfig {
  meteor?: {
    /**
     * Vite client entry into Meteor.
     * Not to be confused with your Meteor mainModule.
     *
     * {@link https://github.com/Akryum/meteor-vite#readme}
     */
    clientEntry?: string

    /**
     * Settings for controlling how stubs created by Meteor-Vite are validated.
     * These settings only apply in a development environment. Once the app is bundled for production, runtime
     * stub validation is disabled.
     */
    stubValidation?: StubValidationSettings
  }
}

export interface StubValidationSettings {
  /**
   * list of packages to ignore export validation for.
   * @example
   * { ignorePackages: ['ostrio:cookies', 'test:ts-modules', ...] }
   */
  ignorePackages?: string[]

  /**
   * Will only emit warnings in the console instead of throwing an exception that may prevent the client app
   * from loading.
   * @default true
   */
  warnOnly?: boolean

  /**
   * Whether to completely disable stub validation feature for Meteor-Vite.
   *
   * Tip:
   * You can use a conditional Vite configuration to enable/disable this for your production build
   * {@link https://vitejs.dev/config/#conditional-config}
   *
   * @default false
   */
  disabled?: boolean
}
