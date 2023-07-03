import { ModuleExport, PackageScopeExports } from './Parser';
import Serialize from './Serialize';

export const METEOR_STUB_KEY = `m2`;
export const PACKAGE_SCOPE_KEY = 'm';
export const TEMPLATE_GLOBAL_KEY = 'g';

export function stubTemplate({ stubId, packageId, exports, packageScopeExports }: TemplateOptions) {
    const moduleExports = prepareExports(exports);
    const packageScope = preparePackageScopeExports(packageScopeExports);
    
    return`
const ${TEMPLATE_GLOBAL_KEY} = typeof window !== 'undefined' ? window : global
${packageScope.top}
${moduleExports.top}

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

${packageScope.bottom}
${moduleExports.bottom}
`
}

function preparePackageScopeExports(packageExports: PackageScopeExports) {
    const top: string[] = [];
    const bottom: string[] = [];
    
    const exportList = Object.entries(packageExports);
    
    exportList.forEach(([name, exports]) => {
        top.push(Serialize.packageScopeImport(name));
        exports.forEach((key) => bottom.push(Serialize.packageScopeExport(key)));
    });
    
    return {
        top: top.join('\n'),
        bottom: bottom.join('\n'),
    };
}

function prepareExports(exports: ModuleExport[]) {
    const top: string[] = [];
    const bottom: string[] = [];
    
    exports.forEach((module) => {
        if (module.type === 'global-binding') return;
        
        const line = Serialize.moduleExport(module);
        
        if (module.type === 're-export') {
            top.push(line);
        }
        
        if (module.type === 'export') {
            bottom.push(line);
        }
        
        if (module.type === 'export-default') {
            bottom.push(line)
        }
    })
    
    return {
        top: top.join('\n'),
        bottom: bottom.join('\n'),
    }
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
    packageScopeExports: PackageScopeExports,
    stubId: number;
}
