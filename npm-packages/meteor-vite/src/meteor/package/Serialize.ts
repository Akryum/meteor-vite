import Path from 'path';
import { inspect } from 'util';
import Logger from '../../Logger';
import { ErrorMetadata, MeteorViteError } from '../../vite/error/MeteorViteError';
import { ModuleExport, PackageScopeExports } from './parser/Parser';
import { METEOR_STUB_KEY, PACKAGE_SCOPE_KEY, TEMPLATE_GLOBAL_KEY } from './StubTemplate';


export default new class Serialize {
    
    public moduleExport(module: ModuleExport, packageId: string) {
        if (module.type === 're-export') {
            let from = module.from?.startsWith('.')
                       ? `${packageId}/${module.from?.replace(/^[./]+/, '')}`
                       : module.from;
            
            if (module.name?.trim() === '*' && !module.as) {
                return `export * from '${from}';`
            }
            
            return `export { ${module.name} ${module.as && `as ${module.as} ` || ''}} from '${from}';`
        }
        
        if (module.type === 'export-default' || (module.type === 'export' && module.name === 'default')) {
            return `export default ${METEOR_STUB_KEY}.default ?? ${METEOR_STUB_KEY};`
        }
        
        if (module.type === 'export') {
            return `export const ${module.name} = ${METEOR_STUB_KEY}.${module.name};`
        }
        
        throw new Error('Tried to format an non-supported module export!');
    }
    
    public packageScopeExport(exportName: string) {
        return `export const ${exportName} = ${PACKAGE_SCOPE_KEY}.${exportName};`;
    }
    
    public packageScopeImport(packageName: string) {
        return `const ${PACKAGE_SCOPE_KEY} = ${TEMPLATE_GLOBAL_KEY}.Package['${packageName}']`;
    }
    
    public parseModules({ packageId, packageScope, modules }: {
        packageId: string;
        packageScope: PackageScopeExports,
        modules: ModuleExport[]
    }) {
        type PlacementGroup = { top: string[], bottom: string[] }
        const result: {
            module: PlacementGroup,
            package: PlacementGroup,
            exportedKeys: string[],
        } = {
            exportedKeys: [],
            module: {
                top: [],
                bottom: []
            },
            package: {
                top: [],
                bottom: [],
            }
        }
        
        const reservedKeys = new Set<string>();
        
        Object.entries(packageScope).forEach(([name, exports]) => {
            result.package.top.push(this.packageScopeImport(name));
            
            exports.forEach((key) => {
                reservedKeys.add(key);
                result.package.bottom.push(this.packageScopeExport(key))
            });
        });
        
        modules.forEach((moduleExport) => {
            if (!moduleExport.name) return;
            if (moduleExport.type === 'global-binding') return;
            if (reservedKeys.has(moduleExport.name)) {
                const error = new ConflictingExportKeys(`Detected conflicting export for "${moduleExport.name}" in "${packageId}"`, {
                    conflict: {
                        key: moduleExport.name,
                        packageScope,
                        moduleExports: modules,
                    },
                    package: {
                        packageId,
                    },
                });
                error.beautify().then(() => Logger.warn(error));
                return;
            }
            
            const line = this.moduleExport(moduleExport, packageId);
            
            if (moduleExport.type === 're-export') {
                result.module.top.push(line);
            }
            if (moduleExport.type === 'export') {
                result.module.bottom.push(line);
                reservedKeys.add(moduleExport.name)
            }
            
            if (moduleExport.type === 'export-default') {
                result.module.bottom.push(line);
                reservedKeys.add('default');
            }
        });
        
        result.exportedKeys.push(...reservedKeys);
        
        return result;
    }
    
}

/**
 * Check if the two provided module paths are the same.
 * Todo: this may end up causing issues if a package has say a "myModule.ts" and a "myModule.ts" file.
 */
const REGEX_LEADING_SLASH = /^\/+/
export function isSameModulePath(options: {
    filepathA: string,
    filepathB: string,
    compareExtensions: boolean;
}) {
    const fileA = Path.parse(options.filepathA.replace(REGEX_LEADING_SLASH, ''));
    const fileB = Path.parse(options.filepathB.replace(REGEX_LEADING_SLASH, ''));

    if (fileA.dir !== fileB.dir) {
        return false;
    }
    
    if (options.compareExtensions && fileA.ext !== fileB.ext) {
        return false;
    }
    
    return fileA.name === fileB.name;
}

export class ConflictingExportKeys extends MeteorViteError {
    constructor(
        message: string,
        public readonly meta: ErrorMetadata & {
            conflict: {
                key: string,
                moduleExports: ModuleExport[] | string[],
                packageScope: PackageScopeExports | string[]
            }}
    ) {
        super(message, meta);
    }
    
    protected async formatLog() {
        const { key, packageScope, moduleExports } = this.meta.conflict;
        this.addSection('Conflict', {
            exportKey: key,
        })
        this.addSection('Package Exports', packageScope);
        this.addSection('Module Exports', moduleExports);
    }
}


