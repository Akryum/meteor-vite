const g = typeof window !== 'undefined' ? window : global
export {Meteor as MyMeteor} from '/@id/__x00__meteor/meteor'
export * from '/@id/__x00__meteor/tracker'
export {Meteor as ReExportedMeteor} from '/@id/__x00__meteor/meteor'

let m2
const require = Package.modules.meteorInstall({
    '__vite_stub6.js': (require, exports, module) => {
        m2 = require('meteor/test:ts-modules')
    },
}, {
    "extensions": [
        ".js",
    ]
})
require('/__vite_stub6.js')

export const first = m2.first
export const FIRST = m2.FIRST
export const b = m2.b
export const c = m2.c
export const namedFunction = m2.namedFunction
export const ExportXInteger = m2.ExportXInteger
export const ExportXString = m2.ExportXString
export const ExportXObject = m2.ExportXObject
export const NamedRelativeInteger = m2.NamedRelativeInteger
export default m2.default ?? m2
