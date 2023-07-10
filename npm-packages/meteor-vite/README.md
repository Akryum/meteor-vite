# Meteor Vite plugin
Handles the creation of stubs for Meteor's Atmosphere packages to enable Vite to be compatible with Meteor.

This package is not intended to be used by itself as it is a dependency of the
[`vite:bundler`](https://github.com/JorgenVatle/meteor-vite#readme) Atmosphere package.

## Contribution notes
#### Testing changes
As this package is independent of Meteor's packaging system, we would normally need to compile this one 
independently. It would be nice to have it all done in one place, however, Meteor's build system is a pain to work 
with, for both me and my code editor.

When firing up the [Vue example](../../examples/vue) project, launch it with `npm run dev:build`. Which will spawn a 
a second worker in addition to the Vite server for compiling `meteor-vite` package.



