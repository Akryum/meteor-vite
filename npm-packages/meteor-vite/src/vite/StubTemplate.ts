import { ModuleExport, PackageScopeExports, ParserResult } from '../Parser';
import Serialize from '../util/Serialize';

export const METEOR_STUB_KEY = `m2`;
export const PACKAGE_SCOPE_KEY = 'm';
export const TEMPLATE_GLOBAL_KEY = 'g';

export function stubTemplate({ stubId, packageId, moduleExports, requestId, packageScopeExports }: TemplateOptions) {
    const serialized = Serialize.parseModules({
        packageName: packageId,
        modules: moduleExports,
        packageScope: packageScopeExports,
    });
    // language="js"
    return`
// requestId: ${requestId}
// packageId: ${packageId}
import { validateStub } from 'meteor-vite/client';
const ${TEMPLATE_GLOBAL_KEY} = typeof window !== 'undefined' ? window : global;
${serialized.package.top.join('\n')}
${serialized.module.top.join('\n')}

let ${METEOR_STUB_KEY};
const require = Package.modules.meteorInstall({
  '__vite_stub${stubId}.js': (require, exports, module) => {
      ${METEOR_STUB_KEY} = require('${requestId}');
    
      validateStub({
          requestId: '${requestId}',
          packageName: '${packageId}',
          stubbedPackage: ${METEOR_STUB_KEY},
          exportKeys: ${JSON.stringify(serialized.exportedKeys)},
      });
  }
}, {
  "extensions": [
    ".js"
  ]
})
require('/__vite_stub${stubId}.js')

${serialized.package.bottom.join('\n')}
${serialized.module.bottom.join('\n')}
`
}

export function viteAutoImportBlock({ content, id }: { content: string, id: string }) {
    const importRegex = /(?<startBlock>\*\*\/[\r\n\s]+)(?<imports>.*[\r\n])(?<endBlock>[\s\r\n]*\/\*\* End of vite:bundler auto-imports \*\*\/)/;
    let { startBlock, imports, endBlock } = content.match(importRegex)?.groups || { imports: '' };
    
    imports += `import '${id}';\n`;
    imports = imports.trim();
    
    if (endBlock && startBlock) {
        return content.replace(importRegex, `${startBlock.trim()}\n${imports}\n${endBlock.trim()}`);
    }
    
    return `/**
 * These modules are automatically imported by vite:bundler.
 * You can commit these to your project or move them elsewhere if you'd like,
 * but they must be imported somewhere in your Meteor entrypoint file.
 *
 * More info: https://github.com/Akryum/meteor-vite/blob/main/packages/vite-bundler/README.md#lazy-loaded-meteor-packages
**/
${imports}
/** End of vite:bundler auto-imports **/

${content}`;
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
    requestId: string;
}
