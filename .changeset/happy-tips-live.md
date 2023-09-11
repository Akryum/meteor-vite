---
"vite-bundler": minor
---

## Features
- Load Vite entrypoint module dynamically while waiting for the server to start up.
- Import Vite client bundle in addition to the Vite entrypoint. This should allow for a nice error message to be displayed in the browser when the Vite entrypoint module cannot be loaded.

## Minor changes
- Updated the Vite dev server startup splash screen to include console logs.