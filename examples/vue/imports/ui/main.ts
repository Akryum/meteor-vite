import { Meteor } from 'meteor/meteor'
import { createApp } from 'vue'
import App from './App.vue'

Meteor.startup(() => {
  const app = createApp(App)
  app.mount('#app')
})
