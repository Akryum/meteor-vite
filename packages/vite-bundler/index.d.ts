import { UserConfig } from 'vite';

declare module 'vite' {
  interface UserConfig {
    /**
     * Meteor configuration
     */
    meteor?: {
      clientEntry: string
    }
  }
}

