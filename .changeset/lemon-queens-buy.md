---
"meteor-vite": minor
---

## Features
### 🔥 Graceful handling of lazy-loaded Meteor packages
Removed the need for a server restart whenever new lazy-loaded packages are added to the Meteor bundle. 
Vite will now continue processing module requests while waiting for Meteor to complete processing requests for
lazy-loaded packages.

This makes the initial client startup process incredibly smooth comparing with previous versions. 🥳

### Minor changes
- Update MeteorStubs plugin error handler to emit errors when a Meteor client entrypoint isn't specified
- Wrap MeteorStubs plugin around plugin setup helper function to catch and format exceptions whenever possible
- The Vite worker now has a [`MeteorEvents`](https://github.com/JorgenVatle/meteor-vite/blob/f8445f71e0a7979e6a29460e825ee34bf387a0ec/npm-packages/meteor-vite/src/meteor/MeteorEvents.ts)
  interface to listen in on IPC messages sent by Meteor, such as client refresh and pause events.