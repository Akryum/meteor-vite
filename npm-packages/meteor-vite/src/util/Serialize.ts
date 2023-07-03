import { METEOR_STUB_KEY, PACKAGE_SCOPE_KEY, TEMPLATE_GLOBAL_KEY } from '../vite/StubTemplate';
import { ModuleExport, PackageScopeExports, ParserResult } from '../Parser';


export default new class Serialize {
    
    public moduleExport(module: ModuleExport) {
        if (module.type === 're-export') {
            if (module.name?.trim() === '*' && !module.as) {
                return `export * from '${module.from}';`
            }
            return `export { ${module.name} ${module.as && `as ${module.as} ` || ''}} from '${module.from}';`
        }
        if (module.type === 'export-default') {
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
    
    public parserResult(result: ParserResult): SerializedParserResult {
        return {
            packageScope: this.packageScopeExports(result.packageScopeExports),
            modules: Object.fromEntries(Object.entries(result.modules).map(([fileName, exports]) => {
                return [fileName, this.moduleExports(exports)];
            }))
        }
    }
    
    public packageScopeExports(packageExports: PackageScopeExports) {
        const top: string[] = [];
        const bottom: string[] = [];
        
        const exportList = Object.entries(packageExports);
        
        exportList.forEach(([name, exports]) => {
            top.push(this.packageScopeImport(name));
            exports.forEach((key) => bottom.push(this.packageScopeExport(key)));
        });
        
        return {
            top: top.join('\n'),
            bottom: bottom.join('\n'),
        };
    }
    
    public moduleExports(exports: ModuleExport[]) {
        const top: string[] = [];
        const bottom: string[] = [];
        
        exports.forEach((module) => {
            if (module.type === 'global-binding') return;
            
            const line = this.moduleExport(module);
            
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
}

export function getMainModule(result: ParserResult) {
    if (!result.mainModulePath) return;
    const [node_modules, meteor, packageName, ...filePath] = result.mainModulePath.replace(/^\/+/g, '').split('/');
    const moduleKey = filePath.join('/');
    return result.modules[moduleKey];
}

export type SerializedParserResult = {
    packageScope: {
        top: string;
        bottom: string;
    },
    modules: {
        [key in string]: {
            top: string;
            bottom: string;
        }
    }
}

export function getModuleFromPath({ result, importPath }: { result: ParserResult, importPath: string }) {
    const entries = Object.entries(result.modules);
    const file = entries.find(([fileName, modules]) => {
        return importPath.replace(/^\/+/g, '') === fileName.replace(/\.\w{2,5}$/g, '')
    });
    
    if (!file) {
        throw new Error(`Could not locate module for path: ${importPath}!`);
    }
    
    const [fileName, modules] = file;
    
    return { fileName, modules };
}