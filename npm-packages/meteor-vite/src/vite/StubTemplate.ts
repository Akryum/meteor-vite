import { Serializer } from 'v8';
import { ModuleExport, PackageScopeExports, ParserResult } from '../Parser';
import Serialize from '../util/Serialize';

export const METEOR_STUB_KEY = `m2`;
export const PACKAGE_SCOPE_KEY = 'm';
export const TEMPLATE_GLOBAL_KEY = 'g';

export function stubTemplate({ stubId, packageId, moduleExports, packageScopeExports }: TemplateOptions) {
    const serialized = Serialize.parseModules({
        packageName: packageId,
        modules: moduleExports,
        packageScope: packageScopeExports,
    });
    
    return`
// packageId: ${packageId}
const ${TEMPLATE_GLOBAL_KEY} = typeof window !== 'undefined' ? window : global
${serialized.package.top.join('\n')}
${serialized.module.top.join('\n')}

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

${serialized.package.bottom.join('\n')}
${serialized.module.bottom.join('\n')}
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
