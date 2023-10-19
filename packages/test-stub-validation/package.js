Package.describe({
  name: 'test:stub-validation',
  version: '0.0.1',
  summary: 'summary',
  git: 'https://github.com/Akryum/meteor-vite',
  documentation: 'README.md',
})

Package.onUse((api) => {
  api.use('ecmascript')
  api.use('zodern:types')
  api.use('typescript')
  api.mainModule('index.ts', ['client', 'server'], { lazy: true })
})
