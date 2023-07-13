Package.describe({
  name: 'test:lazy',
  version: '0.0.1',
  summary: 'summary',
  git: 'https://github.com/Akryum/meteor-vite',
  documentation: 'README.md',
})

Package.onUse(function(api) {
  api.use('ecmascript')
  api.mainModule('index.js', ['client', 'server'], { lazy: true });
})
