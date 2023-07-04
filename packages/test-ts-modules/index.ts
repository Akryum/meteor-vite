/**
 * Check if text casing is being handled as expected.
 */
export const first = 'lowercase';
export const FIRST = 'UPPERCASE';

/**
 * Check export bracket exports
 */
const b = 2;
const c = 3;
export { b, c }

export function namedFunction() {
    return 'bar'
}
export default namedFunction

export { Meteor as MyMeteor } from 'meteor/meteor'

export * from 'meteor/tracker'

export { Meteor as ReExportedMeteor } from 'meteor/meteor'

import { Meteor } from 'meteor/meteor'

export { NamedRelativeInteger } from './relative-module';

export * from './export-star-from';

export { WhereAmI as WhereIsTheSubmodule } from './subdirectory/module-in-subdirectory';

Meteor.version
