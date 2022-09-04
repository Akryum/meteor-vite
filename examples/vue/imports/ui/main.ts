import './main.pcss'

import { Meteor } from 'meteor/meteor'
import { createApp } from 'vue'
import { router } from './router'
import { VueMeteor } from './v-meteor'
import App from './App.vue'

Meteor.startup(() => {
  const app = createApp(App)
  app.use(router)
  app.use(VueMeteor)
  app.mount('#app')
})
