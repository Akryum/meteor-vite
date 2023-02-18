import './main.pcss'

import { Meteor } from 'meteor/meteor'
import { createApp } from 'vue'
import { Logger, WrapConsole } from '../api/logger';
import { router } from './router'
import { VueMeteor } from './v-meteor'
import App from './App.vue'
import { MEOWMEOW } from 'meteor/test:lazy'
import { check } from 'meteor/check'
import './tests/ts-modules.test';

console.log('lazy meteor package:', MEOWMEOW)
console.log(check)

Meteor.startup(() => {
  const app = createApp(App);
  app.use(router)
  app.use(VueMeteor)
  app.mount('#app');
  
  WrapConsole();
  
  import('./tests/ts-modules.test').catch((error) => {
    console.error('Error importing test module!', error);
  });
})
