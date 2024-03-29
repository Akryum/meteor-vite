# vite-bundler

## 1.4.1

### Patch Changes

- a20a85a: Fix documentation reference in package.js

## 1.4.0

### Minor Changes

- a95e216: - Load Vite entrypoint module dynamically while waiting for the server to start up.
  - Import Vite client bundle in addition to the Vite entrypoint. This should allow for a nice error message to be displayed in the browser when the Vite entrypoint module cannot be loaded.
  - Updated the Vite dev server startup splash screen to include console logs.

## 1.2.3

### Patch Changes

- 74d9bab: Refresh page if the Vite dev server entrypoint fails to load in the browser

## 1.2.2

### Patch Changes

- d883954: Read Isopack metadata from global Meteor package cache

  Fixes #26

## 1.2.1

### Patch Changes

- 0c29f67: Hotfix: Vite-Bundler builds being skipped due to invalid environment variable check

## 1.2.0

### Minor Changes

- c5467ef: Transmit Meteor's IPC messages through to Vite worker process, enabling Meteor-Vite to gracefully import lazy-loaded packages for the client without throwing errors.

## 1.1.3

### Patch Changes

- 661d17d: Fix issue where production builds would fail for projects without a tsconfig.json file

## 1.1.2

### Patch Changes

- 3367848: Update internal communication between the Vite server worker and Meteor.

  Add fallback method for clients waiting on Vite server configuration from Meteor.

  Allow Vite config files to be stored outside of the project's root directory through package.json configuration. Details should be added to the README.

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
