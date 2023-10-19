const antfu = require('@antfu/eslint-config').default

module.exports = antfu({
  typescript: true,
  vue: true,
  ignores: [
    'examples/output/',
    '**/.meteor',
    '**/.npm',
    'npm-packages/meteor-vite/test/__mocks',
  ],
}, {
  rules: {
    'node/prefer-global/process': 'off',
    'no-console': 'warn',
    'antfu/no-cjs-exports': 'off',
    'ts/no-namespace': 'warn',
  },
})
