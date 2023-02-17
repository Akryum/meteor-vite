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

export { default as ReExportedDefault, other, subOther } from './other'

import { Meteor } from 'meteor/meteor'

Meteor.version