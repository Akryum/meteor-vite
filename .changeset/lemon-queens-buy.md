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
