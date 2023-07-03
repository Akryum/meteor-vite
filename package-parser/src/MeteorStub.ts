
function moduleTemplate({ stubId, packageId }: TemplateOptions) {
    return`
let m2
const require = Package.modules.meteorInstall({
  '__vite_stub${stubId}.js': (require, exports, module) => {
    m2 = require('${packageId}')
  },
}, {
  "extensions": [
    ".js",
  ]
})
require('/__vite_stub${stubId}.js')
`
}

interface TemplateOptions {
    /**
     * Meteor package ID.
     * Essentially `meteor/<author>:<packageName>`
     *
     * @example Offical package
     * 'meteor/accounts-base'
     * @example With sub-modules
     * 'meteor/ostrio:cookies/some-module'
     */
    packageId: string;
    
    /**
     * Vite-meteor-stub ID
     */
    stubId: number;
}
