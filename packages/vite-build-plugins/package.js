Package.describe({
    name: 'vite:build-plugins',
    version: '0.1.10',
    summary: 'Integrate the Vite.js bundler with Meteor',
    git: 'https://github.com/Akryum/meteor-vite',
    documentation: 'README.md',
})

Package.onUse(function(api) {
    api.use('isobuild:compiler-plugin@1.0.0')
    api.use('ecmascript')
    api.addAssets([
        'vite-load-plugin.mjs',
        'worker-dev.mjs',
    ], 'server')
    api.addFiles(['plugin.js'], 'server')
    api.export(['ViteBuildPlugins'], 'server')
})
