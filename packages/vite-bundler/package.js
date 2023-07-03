Package.describe({
  name: 'vite:bundler',
  version: '0.1.10',
  summary: 'Integrate the Vite.js bundler with Meteor',
  git: 'https://github.com/Akryum/meteor-vite',
  documentation: 'README.md',
})

// todo: publish to npm
const localNpmDepednencies = {
  'meteor-vite': `file://${process.env.PWD ?? process.cwd()}/../../npm-packages/meteor-vite`
}

Package.registerBuildPlugin({
  name: 'vite',
  use: [
    'ecmascript@0.16.2',
    'caching-compiler@1.2.2',
    'babel-compiler@7.9.0',
    'vite:build-plugins'
  ],
  sources: [
    'build.js',
  ],
  npmDependencies: {
    execa: '6.1.0',
    'fs-extra': '10.1.0',
    'picocolors': '1.0.0',
    ...localNpmDepednencies
  },
})

Npm.depends(localNpmDepednencies);
Package.onUse(function(api) {
  api.use('isobuild:compiler-plugin@1.0.0')
  api.use('zodern:types')
  api.use('ecmascript')
  api.use('webapp@1.13.1')
  api.use('vite:build-plugins');
  api.mainModule('server.js', 'server')
})

