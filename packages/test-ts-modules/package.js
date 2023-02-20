Package.describe({
    name: 'test:ts-modules',
    version: '0.0.1',
    summary: 'summary',
    git: 'https://github.com/Akryum/meteor-vite',
    documentation: 'README.md',
})

Package.onUse(function(api) {
    api.use('ecmascript')
    api.use('typescript')
    api.use('zodern:types:1.0.9')
    api.addFiles('explicit-relative-path.ts');
    api.mainModule('index.ts', ['client', 'server']);
})
