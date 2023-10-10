/// <reference types="svelte" />

import { Meteor } from 'meteor/meteor'
import App from './App.svelte'

Meteor.startup(() => {
  // eslint-disable-next-line no-new
  new App({
    target: document.getElementById('app')!,
  })
})
