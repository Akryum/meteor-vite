# meteor-vite

## 1.2.0

### Minor Changes

- 00a3567: - Migrate Vite stub validation configuration from Meteor's `settings.json` to Vite config.
  - Update exception names for stub validation
  - Add an option to stub validation where you can toggle it on or off entirely.

## 1.1.1

### Patch Changes

- c22937e: Fix error handling for non-MeteorVite errors

## 1.1.0

### Minor Changes

- 662a820: - Fixed an issue where Meteor builds with lazy-loaded packages would only work if Meteor had been run at least once in development mode.
  - Fixed an issue where some lazy-loaded packages would cause the Vite dev server to become unresponsive
  - Updated Vite dev server loggers.
