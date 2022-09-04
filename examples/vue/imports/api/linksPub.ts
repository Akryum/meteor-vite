import { Meteor } from 'meteor/meteor'
import { LinksCollection } from './links'

Meteor.publish('links', () => {
  return LinksCollection.find({})
})
