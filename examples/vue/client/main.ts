/**
 * These modules are automatically imported by vite:bundler.
 * You can commit these to your project or move them elsewhere if you'd like,
 * but they must be imported somewhere in your Meteor entrypoint file.
 *
 * More info: https://github.com/Akryum/meteor-vite/blob/main/packages/vite-bundler/README.md#lazy-loaded-meteor-packages
**/
import 'meteor/test:lazy';
import 'meteor/test:ts-modules/re-exports-index';
import 'meteor/test:ts-modules/relative-module';
import 'meteor/test:ts-modules/export-star-from';
import 'meteor/test:ts-modules/subdirectory/module-in-subdirectory';
import 'meteor/test:modules/other';
import 'meteor/test:ts-modules/re-exports-source';
import 'meteor/test:modules/sub-other';
/** End of vite:bundler auto-imports **/

import { Cookies } from 'meteor/ostrio:cookies'

const cookies = new Cookies()
console.log('(meteor) cookies', cookies.get('meteor_login_token')) 
