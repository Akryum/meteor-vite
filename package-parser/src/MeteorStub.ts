import { ModuleExport } from './Parser';
import { exportTemplate } from './Serializer';

export const METEOR_STUB_KEY = `m2`;

function stubTemplate({ stubId, packageId, exports }: TemplateOptions) {
    const { templateTop, templateBottom } = prepareExports(exports);
    
    return`
${templateTop}

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

${templateBottom}
`
}

function prepareExports(exports: ModuleExport[]) {
    const top: string[] = [];
    const bottom: string[] = [];
    
    exports.forEach((module) => {
        if (module.type === 'global-binding') return;
        
        const line = exportTemplate(module);
        
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
        templateTop: top.join('\n'),
        templateBottom: bottom.join('\n'),
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
    stubId: number;
}
