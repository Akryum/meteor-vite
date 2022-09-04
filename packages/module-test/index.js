export const A = 'A'

export function foo () {
  return 'bar'
}

const a = 1
const b = 2

export {
  a,
  b,
}

export default foo

export { Meteor as MyMeteor } from 'meteor/meteor'

export * from 'meteor/tracker'

import { Meteor } from 'meteor/meteor'

Meteor.version
