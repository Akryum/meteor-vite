import './main.pcss'

import { Meteor } from 'meteor/meteor'
import { createApp } from 'vue'
import { router } from './router'
import { VueMeteor } from './v-meteor'
import App from './App.vue'
import { MEOWMEOW } from 'meteor/test:lazy'

console.log('lazy meteor package:', MEOWMEOW)

Meteor.startup(() => {
  const app = createApp(App)
  app.use(router)
  app.use(VueMeteor)
  app.mount('#app')
})
