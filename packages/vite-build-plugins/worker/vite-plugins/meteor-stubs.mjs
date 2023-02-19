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
    if (id.startsWith('\0meteor/')) {
        id = id.slice(1)
        const file = path.join(meteorPackagePath, `${id.replace(/^meteor\//, '').replace(/:/g, '_')}.js`)
        const content = await fs.readFile(file, 'utf8')
        const moduleContent = readModuleContent(content);

        let code = `const g = typeof window !== 'undefined' ? window : global\n`

        const exportedKeys = []

        // Meteor exports
        const [, packageName, exported] = /Package\._define\("(.*?)"(?:,\s*exports)?,\s*{\n((?:\s*(?:\w+):\s*\w+,?\n)+)}\)/.exec(content) ?? []
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
        const linkReg = /module\d*\.link\("(.*?)", {\n((?:\s*.+:\s*.*\n)+?)}, \d+\);/gm
        while (linkResult = linkReg.exec(moduleContent)) {
            linkExports.push([linkResult[1], linkResult[2]])
        }
        if (linkExports.length) {
            for (const linkExport of linkExports) {
                const isRelativeExport = linkExport[0].startsWith('.')
                let wildcard = ''
                const generated = linkExport[1].split('\n').map(line => {
                    const [,source,target] = /\s*"?(.*?)"?:\s*"(.*)"/.exec(line) ?? []
                    if (source && target) {
                        if (isRelativeExport) {
                            relativeExportKeys.push(target)
                            return
                        } else if (source === '*' && target === '*') {
                            wildcard = '*'
                        } else if (source === target) {
                            return source
                        } else {
                            return `${source} as ${target}`
                        }
                    }
                }).filter(Boolean)
                const named = generated.length ? `{${generated.join(', ')}}` : ''
                if (!isRelativeExport) {
                    code += `export ${[wildcard, named].filter(Boolean).join(', ')} from '${linkExport[0]}'\n`
                }
            }
        }

        // Module exports
        let moduleExportsCode = ''
        const [, moduleExports] = /module\d*\.export\({\n((?:.*\n)+?)}\);/.exec(moduleContent) ?? []
        const hasModuleExports = !!moduleExports || !!relativeExportKeys.length
        let hasModuleDefaultExport = moduleContent.includes('module.exportDefault(')
        if (hasModuleExports || hasModuleDefaultExport) {
            const sid = stubUid++
            moduleExportsCode += `${moduleTemplate(id, sid)}\n`
        }
        let finalHasModuleExports = false
        if (hasModuleExports) {
            const keys = moduleExports.split('\n').map(line => {
                const [,key] = /(\w+?):\s*/.exec(line) ?? []
                if (key === 'default') {
                    hasModuleDefaultExport = true;
                    return undefined;
                }
                return key
            }).concat(relativeExportKeys).filter(key => key && !exportedKeys.includes(key))
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
        // When bundling for production we can omit this build step.
        if (isForProduction) {
            return code;
        }

        const manifestFile = path.join('.meteor', 'local', 'isopacks', `${id.replace(/^meteor\//, '').replace(/:/g, '_')}`, 'web.browser.json')
        if (existsSync(manifestFile)) {
            const manifest = JSON.parse(await fs.readFile(manifestFile, 'utf8'))
            const resource = manifest.resources.find(r => r.fileOptions.mainModule)
            if (resource?.fileOptions.lazy) {
                // Auto-import the package to make it available
                if (!projectJson.meteor?.mainModule?.client) {
                    throw new Error(`No meteor.mainModule.client found in package.json`)
                }
                const meteorClientEntryFile = path.resolve(process.cwd(), projectJson.meteor.mainModule.client)
                if (!existsSync(meteorClientEntryFile)) {
                    throw new Error(`meteor.mainModule.client file not found: ${meteorClientEntryFile}`)
                }
                const content = await fs.readFile(meteorClientEntryFile, 'utf8')
                if (!content.includes(`'${id}'`)) {
                    await fs.writeFile(meteorClientEntryFile, `import '${id}'\n${content}`)
                    throw new Error(`Auto-imported package ${id} to ${meteorClientEntryFile}, please reload`)
                }
            }
        }

        return code
    }
}

function moduleTemplate(id, sid) {
    return`
let m2
const require = Package.modules.meteorInstall({
  '__vite_stub${sid}.js': (require, exports, module) => {
    m2 = require('${id}')
  },
}, {
  "extensions": [
    ".js",
  ]
})
require('/__vite_stub${sid}.js')
`
}

function readModuleContent(content) {
    const contentRegex = /function module\d*\(require,exports,module/;

    const moduleStartIndex = content.search(contentRegex)
    const moduleContent = content.slice(moduleStartIndex, content.search(contentRegex) + moduleStartIndex + 1);

    return moduleContent;
}

function createDebugLogger(packageName, currentFile) {
    if (currentFile.includes(packageName)) {
        return (...args) => console.info(`[${packageName}]`, ...args);
    }
    return (...args) => null;
}
