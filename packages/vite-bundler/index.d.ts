import { MeteorSettings } from '../../npm-packages/meteor-vite';

declare module 'meteor/meteor' {
    module Meteor {
        interface Settings extends MeteorSettings {}
    }
}