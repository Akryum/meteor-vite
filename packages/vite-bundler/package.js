Package.describe({
  name: 'vite:bundler',
  version: '0.1.0',
  summary: 'Integrate the Vite.js bundler with Meteor',
  documentation: 'README.md',
})

Package.registerBuildPlugin({
  name: 'vite',
  use: [
    'ecmascript@0.16.2',
    'caching-compiler@1.2.2',
  ],
  sources: [
    'build.js',
  ],
  npmDependencies: {
    execa: '6.1.0',
    'fs-extra': '10.1.0',
    'picocolors': '1.0.0',
  },
})

Package.onUse(function(api) {
  api.use('isobuild:compiler-plugin@1.0.0')
  api.use('ecmascript')
  api.use('webapp@1.13.1')
  if (process.env.NODE_ENV !== 'production') {
    api.mainModule('server.js', 'server')
    api.addAssets([
      'worker-dev.mjs',
    ], 'server')
  }
})
