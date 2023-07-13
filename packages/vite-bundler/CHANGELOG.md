# vite-bundler

## 1.1.1

### Patch Changes

- 3c553e2: - Rework "waiting for Vite" splash screen to work around issue where the screen would need to be refreshed manually.
  - Add `zodern:types` to vite-bundler

## 1.1.0

### Minor Changes

- 662a820: - Fixed an issue where Meteor builds with lazy-loaded packages would only work if Meteor had been run at least once in development mode.
  - Fixed an issue where some lazy-loaded packages would cause the Vite dev server to become unresponsive
  - Updated Vite dev server loggers.

## 1.0.1

### Patch Changes

- ad22a24: - Clean up internal tsconfig.json
  - Test changeset releases
