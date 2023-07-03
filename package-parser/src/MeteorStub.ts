import { ModuleExport, PackageScopeExports } from './Parser';
import Serialize from './Serialize';

export const METEOR_STUB_KEY = `m2`;
export const PACKAGE_SCOPE_KEY = 'm';
export const TEMPLATE_GLOBAL_KEY = 'g';

export function stubTemplate({ stubId, packageId, moduleExports, packageScopeExports }: TemplateOptions) {
    const serialized = {
        modules: Serialize.moduleExports(moduleExports),
        packages: Serialize.packageScopeExports(packageScopeExports)
    };
    
    return`
// packageId: ${packageId}
const ${TEMPLATE_GLOBAL_KEY} = typeof window !== 'undefined' ? window : global
${serialized.packages.top}
${serialized.modules.top}

let ${METEOR_STUB_KEY};
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

${serialized.packages.bottom}
${serialized.modules.bottom}
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
    moduleExports: ModuleExport[],
    packageScopeExports: PackageScopeExports,
    stubId: number;
}
