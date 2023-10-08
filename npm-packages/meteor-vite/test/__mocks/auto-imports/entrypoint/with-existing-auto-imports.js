/**
 * These modules are automatically imported by vite:bundler.
 * You can commit these to your project or move them elsewhere if you'd like,
 * but they must be imported somewhere in your Meteor entrypoint file.
 *
 * More info: https://github.com/Akryum/meteor-vite/blob/main/packages/vite-bundler/README.md#lazy-loaded-meteor-packages
 **/
import 'meteor/test:ts-modules/re-exports-index';
import 'meteor/test:modules/other';
/** End of vite:bundler auto-imports **/

import { Cookies } from 'meteor/ostrio:cookies'

const cookies = new Cookies()
console.log('(meteor) cookies', cookies.get('meteor_login_token'))
