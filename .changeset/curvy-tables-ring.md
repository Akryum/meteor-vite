---
"meteor-vite": patch
"vite-bundler": patch
---

Update internal communication between the Vite server worker and Meteor.

Add fallback method for clients waiting on Vite server configuration from Meteor.

Allow Vite config files to be stored outside of the project's root directory through package.json configuration. Details should be added to the README.
