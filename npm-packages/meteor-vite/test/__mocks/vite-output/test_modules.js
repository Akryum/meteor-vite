const g = typeof window !== 'undefined' ? window : global
export {Meteor as MyMeteor} from '/@id/__x00__meteor/meteor'
export * from '/@id/__x00__meteor/tracker'

let m2
const require = Package.modules.meteorInstall({
    '__vite_stub8.js': (require, exports, module) => {
        m2 = require('meteor/test:modules')
    },
}, {
    "extensions": [
        ".js",
    ]
})
require('/__vite_stub8.js')

export const A = m2.A
export const foo = m2.foo
export const a = m2.a
export const b = m2.b
export const ReExportedDefault = m2.ReExportedDefault
export const other = m2.other
export const subOther = m2.subOther
export default m2.default ?? m2
