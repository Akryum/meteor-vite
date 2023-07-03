import { ModuleExport } from './Parser';

export const METEOR_STUB_KEY = `m2`;

function stubTemplate({ stubId, packageId }: TemplateOptions) {
    return`
let ${METEOR_STUB_KEY}
const require = Package.modules.meteorInstall({
  '__vite_stub${stubId}.js': (require, exports, module) => {
    ${METEOR_STUB_KEY} = require('${packageId}')
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
    
    exports: ModuleExport[],
    stubId: number;
}
