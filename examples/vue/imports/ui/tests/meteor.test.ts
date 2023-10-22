import { Meteor } from 'meteor/meteor'
import { describe, expect, it } from 'ts-minitest'

export default () => describe('Meteor Core Packages', () => {
  it('can explicitly import Meteor', () => {
    expect(typeof Meteor).toBe('object')
    expect(Meteor.isServer).toBe(false)
    expect(Meteor.isClient).toBe(true)
    expect(typeof Meteor.subscribe).toBe('function')
  })
})
