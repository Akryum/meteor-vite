Package.describe({
  name: 'meteor-vite',
  version: '0.1.0',
  summary: 'Integrate the Vite.js bundler with Meteor',
  documentation: 'README.md',
})

Npm.depends({
})

Package.onUse(function(api) {
  api.use('ecmascript')
  api.use('webapp')
  api.mainModule('server.js', 'server')
  api.addAssets([
    'worker.mjs'
  ], 'server')
})
