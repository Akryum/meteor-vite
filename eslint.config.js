const antfu = require('@antfu/eslint-config').default

module.exports = antfu({
  ignores: [
    'examples/output/',
    '**/.meteor',
    '**/.npm',
    'npm-packages/meteor-vite/test/__mocks',
  ],
})
