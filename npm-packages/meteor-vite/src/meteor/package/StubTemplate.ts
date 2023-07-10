import MeteorPackage from './MeteorPackage';
import { PackageSubmodule } from './PackageSubmodule';
import Serialize from './Serialize';

export const METEOR_STUB_KEY = `m2`;
export const PACKAGE_SCOPE_KEY = 'm';
export const TEMPLATE_GLOBAL_KEY = 'g';

/**
 * Creates a stub for the provided Meteor package and requested submodule.
 * Used to bridge imports for Meteor code that Vite doesn't have access to, to the below template that acts as a
 * proxy between Vite and Meteor's modules.
 */
export function stubTemplate({ requestId, submodule, meteorPackage }: {
    submodule?: PackageSubmodule;
    meteorPackage: MeteorPackage;
    requestId: string;
}) {
    const stubId = getStubId();
    const packageId = meteorPackage.packageId;
    const importPath = submodule?.fullImportPath || packageId;
    const serialized = Serialize.parseModules({
        packageId,
        modules: submodule?.exports || [],
        packageScope: meteorPackage.packageScopeExports,
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
      ${METEOR_STUB_KEY} = require('${importPath}');
    
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

/**
 * Find the vite:bundler auto-import notice block to add more imports within it.
 *
 * {@link https://regex101.com/r/shKDPE/1}
 * @type {RegExp}
 */
const REGEX_AUTO_IMPORT_BLOCK = /(?<startBlock>\*\*\/[\r\n\s]+)(?<imports>(?:.*[\r\n])*)(?<endBlock>[\s\r\n]*\/\*\* End of vite:bundler auto-imports \*\*\/)/

export function viteAutoImportBlock({ content, id }: { content: string, id: string }) {
    let { startBlock, imports, endBlock } = content.match(REGEX_AUTO_IMPORT_BLOCK)?.groups || { imports: '' };
    
    imports += `import '${id}';\n`;
    imports = imports.trim();
    
    if (endBlock && startBlock) {
        return content.replace(REGEX_AUTO_IMPORT_BLOCK, `${startBlock.trim()}\n${imports}\n${endBlock.trim()}`);
    }
    
    return `/**
 * These modules are automatically imported by vite:bundler.
 * You can commit these to your project or move them elsewhere if you'd like,
 * but they must be imported somewhere in your Meteor entrypoint file.
 *
 * More info: https://github.com/JorgenVatle/meteor-vite/blob/main/packages/vite-bundler/README.md#lazy-loaded-meteor-packages
**/
${imports}
/** End of vite:bundler auto-imports **/

${content}`;
}

/**
 * Unique ID for the next stub.
 * @type {number}
 */
let nextStubId = 0;
function getStubId() {
    return nextStubId++;
}
