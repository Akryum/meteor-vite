# meteor-vite

## 1.3.1

### Patch Changes

- 835dbd5: Fix package re-exports being re-exported once more within the Meteor stub template

## 1.3.0

### Minor Changes

- 9bcd19f: - Update MeteorStubs plugin error handler to emit errors when a Meteor client entrypoint isn't specified
  - Wrap MeteorStubs plugin around plugin setup helper function to catch and format exceptions whenever possible

## 1.2.2

### Patch Changes

- 3367848: Update internal communication between the Vite server worker and Meteor.

  Add fallback method for clients waiting on Vite server configuration from Meteor.

  Allow Vite config files to be stored outside of the project's root directory through package.json configuration. Details should be added to the README.

## 1.2.1

### Patch Changes

- 9b26de5: Update parser to eagerly parse and export all available exports for a given Meteor package

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
