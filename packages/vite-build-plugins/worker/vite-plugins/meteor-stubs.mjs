import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';

let stubUid = 0;

export function MeteorStubs({ meteorPackagePath, projectJson, isForProduction = false }) {
    return {
        name: 'meteor-stubs',
        resolveId (id) {
            if (id.startsWith('meteor/')) {
                return `\0${id}`
            }
        },
        load: (id) => load({
            id,
            meteorPackagePath,
            projectJson,
            isForProduction,
        }),
    }
}

async function load({ id, meteorPackagePath, projectJson, isForProduction }) {
    if (!id.startsWith('\0meteor/')) {
       return;
    }
    id = id.slice(1);
    const {
        mainModule,
        namedModules,
        fileContent,
        packageId
    } = await getSourceText({ id, meteorPackagePath, isForProduction, projectJson });
    const moduleList = [mainModule];
    const exportedKeys = []
    let code = `const g = typeof window !== 'undefined' ? window : global\n`

    // Meteor exports
    const [, packageName, exported] = /Package\._define\("(.*?)"(?:,\s*exports)?,\s*{\n((?:\s*(?:\w+):\s*\w+,?\n)+)}\)/.exec(fileContent) ?? []
    if (packageName) {
        const keys = exported.split('\n').map(line => {
            const [,key] = /(\w+):\s*(?:\w+)/.exec(line) ?? []
            return key
        }).filter(Boolean)
        exportedKeys.push(...keys)
        const generated = keys.map(key => `export const ${key} = m.${key}`)
        code += `const m = g.Package['${packageName}']
${generated.join('\n')}\n`
    }

    // Modules re-exports
    let linkExports = []
    let linkResult
    const relativeExportKeys = []
    const linkReg = /module\d*\.link\("(.*?)", {\n((?:\s*.+:\s*.*\n)+?)\s*}, \d+\);/gm
    while (linkResult = linkReg.exec(mainModule)) {
        linkExports.push([linkResult[1], linkResult[2]])
    }
    if (linkExports.length) {
        for (const linkExport of linkExports) {
            const isRelativeExport = linkExport[0].startsWith('.')
            let wildcard = ''
            const generated = linkExport[1].split('\n').map(line => {
                const [,source,target] = /\s*"?(.*?)"?:\s*"(.*)"/.exec(line) ?? []
                if (source && target) {
                    if (source === '*' && target === '*') {
                        wildcard = '*'
                    }
                    if (isRelativeExport) {
                        relativeExportKeys.push(target)
                    }
                    if (wildcard || isRelativeExport) {
                        return;
                    }
                    if (source === target) {
                        return source
                    }
                    return `${source} as ${target}`
                }
            }).filter(Boolean)
            const named = generated.length ? `{${generated.join(', ')}}` : ''
            if (!isRelativeExport) {
                code += `export ${[wildcard, named].filter(Boolean).join(', ')} from '${linkExport[0]}'\n`
            } else if (wildcard) {
                moduleList.push(namedModules.get(linkExport[0]).content);
            }
        }
    }

    // Module exports
    let moduleExportsCode = ''
    let moduleExports = '';
    let hasModuleDefaultExport = false;
    for (const content of moduleList) {
        const [, exports] = /module\d*\.export\({\n((?:.*\n)+?)\s*}\);/.exec(content) ?? []
        moduleExports += `${exports}\n`;
        hasModuleDefaultExport = content.match(/module\d*\.exportDefault\(/) || hasModuleDefaultExport;
    }
    const hasModuleExports = !!moduleExports || !!relativeExportKeys.length
    if (hasModuleExports || hasModuleDefaultExport) {
        const sid = stubUid++
        moduleExportsCode += `${moduleTemplate(packageId, sid)}\n`
    }
    let finalHasModuleExports = false
    if (hasModuleExports) {
        const keys = moduleExports.split('\n').map(line => {
            const [,key] = /(\w+?):\s*/.exec(line) ?? []
            return key
        }).concat(relativeExportKeys).filter((key) => {
            if (!key) {
                return;
            }
            if (exportedKeys.includes(key)) {
                return;
            }
            if (key === '*') {
                return;
            }
            if (key === 'default') {
                hasModuleDefaultExport = true;
                return;
            }
            return true;
        })
        exportedKeys.push(...keys)
        finalHasModuleExports = keys.length > 0
        const generated = keys.map(key => `export const ${key} = m2.${key}`)
        moduleExportsCode += `${generated.join('\n')}\n`
    }
    if (hasModuleDefaultExport) {
        moduleExportsCode += 'export default m2.default ?? m2\n'
    }
    if (finalHasModuleExports || hasModuleDefaultExport) {
        code += moduleExportsCode
    }

    // Lazy (Isopack)
    // When bundling for production we can omit this build step?
    if (isForProduction) {
        return code;
    }


    return code
}

function moduleTemplate(packageId, sid) {
    return`
let m2
const require = Package.modules.meteorInstall({
  '__vite_stub${sid}.js': (require, exports, module) => {
    m2 = require('${packageId}')
  },
}, {
  "extensions": [
    ".js",
  ]
})
require('/__vite_stub${sid}.js')
`
}

class NamedModules {
    constructor(packageId) {
        this._modules = {};
        this.packageId = packageId;
    }

    add(name, content) {
        this._modules[name] = content;
    }

    get(path) {
        const moduleName = path.replace(/^([.\/]{1,2})?|(\.\w+$)?/g, '');
        const module = Object.entries(this._modules).find(([key]) => {
            return key.startsWith(moduleName)
        });
        if (!module) {
            throw new MeteorViteError(
                `Could not locate module "${path}". Maybe it's not available in ${this.packageId}?\n` +
                `Detected files in ${this.packageId}:\n  - ${Object.keys(this._modules).join('\n  - ')}`);
        }
        return {
            name: module[0],
            content: module[1],
        };
    }
}

function parseModules(content, packageId) {
    const regex = /(?:^},|)"(?<moduleName>[\w\-. ]+)":function module\(require,exports,module\)/img;
    const namedModules = new NamedModules(packageId);

    function getModuleSnippet(fromIndex) {
        const contentStart = content.slice(fromIndex).replace(/.*$/m, '');
        const toIndex = contentStart.search(regex);

        return contentStart.slice(0, toIndex);
    }

    for (const match of content.matchAll(regex)) {
        namedModules.add(match.groups.moduleName, getModuleSnippet(match.index));
    }

    return {
        mainModule: namedModules._modules[0],
        namedModules,
    }
}

class MeteorViteError extends Error {}

function createDebugLogger(packageName, currentFile) {
    if (currentFile.includes(packageName)) {
        return (...args) => console.info(`[${packageName}]`, ...args);
    }
    return (...args) => null;
}

async function getSourceText({ meteorPackagePath, id, projectJson }) {
    let {
        /**
         * Base Atmosphere package import This is usually where we find the full package content, even for packages
         * that have multiple entry points.
         * E.g. `meteor/ostrio:cookies`
         * @type {string}
         */
        packageId,

        /**
         * Requested file path inside the package. (/some-module)
         * Used for packages that have multiple entry points or no mainModule specified in package.js.
         * E.g. `import { Something } from `meteor/ostrio:cookies/some-module`
         * @type {string | undefined}
         */
        importPath
    } = id.match(/(?<packageId>(meteor\/)[\w\-. ]+(:[\w\-. ]+)?)(?<importPath>\/.+)?/)?.groups || {};

    const packageName = packageId.replace(/^meteor\//, '');
    const sourceName = packageName.replace(':', '_');
    const sourceFile = `${sourceName}.js`;
    const sourcePath = path.join(meteorPackagePath, sourceFile);
    const fileContent = await fs.readFile(sourcePath, 'utf8');

    await checkManifest({ id, sourceName, projectJson, importPath });

    let { mainModule, namedModules } = parseModules(fileContent, packageId);

    if (importPath) {
        const requestedModule = namedModules.get(importPath);
        mainModule = requestedModule.content;
        packageId = `${packageId}/${requestedModule.name}`;
    }

    return {
        mainModule,
        namedModules,
        fileContent,
        packageId,
    }
}

async function checkManifest({ id, sourceName, projectJson, importPath }) {
    const manifestPath = path.join('.meteor', 'local', 'isopacks', sourceName, 'web.browser.json');
    if (!existsSync(manifestPath) || !projectJson) {
        return;
    }

    async function autoImport() {
        if (!projectJson.meteor?.mainModule?.client) {
            throw new Error(`⚡  No meteor.mainModule.client found in package.json`)
        }
        const meteorClientEntryFile = path.resolve(process.cwd(), projectJson.meteor.mainModule.client)
        if (!existsSync(meteorClientEntryFile)) {
            throw new Error(`⚡  meteor.mainModule.client file not found: ${meteorClientEntryFile}`)
        }
        const content = await fs.readFile(meteorClientEntryFile, 'utf8')
        if (!content.includes(`'${id}'`)) {
            await fs.writeFile(meteorClientEntryFile, viteAutoImportBlock({ content, id }))
            throw new Error(`⚡  Auto-imported package ${id} to ${meteorClientEntryFile}, please reload`)
        }
    }

    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    let resource = manifest.resources.find((resource) => resource.fileOptions.mainModule);

    // If a specific file is requested, e.g. `meteor/ostrio:cookies/some-module.js`
    if (importPath) {
        resource = manifest.resources.find((resource) => resource.file.includes(importPath));
    }

    if (resource?.fileOptions?.lazy) {
        await autoImport();
    }

}



function viteAutoImportBlock({ content, id}) {
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