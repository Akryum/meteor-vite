import type { ModuleList, PackageScopeExports, ParsedPackage } from './Parser';
import { isSameModulePath, PackageSubmodule } from './Serialize';

export default class MeteorPackage implements ParsedPackage {
    
    public readonly name: string;
    public readonly modules: ModuleList;
    public readonly mainModulePath?: string;
    public readonly packageScopeExports: PackageScopeExports;
    
    constructor(public readonly parsedPackage: ParsedPackage) {
        this.name = parsedPackage.name;
        this.modules = parsedPackage.modules;
        this.packageScopeExports = parsedPackage.packageScopeExports;
        this.mainModulePath = parsedPackage.mainModulePath;
    }
    
    public getExports({ importPath }: { importPath?: string }): PackageModuleExports {
        if (!importPath) {
            return this.mainModule;
        }
        
        const entries = Object.entries(this.modules);
        const file = entries.find(
            ([fileName, modules]) => isSameModulePath({
                filepathA: importPath,
                filepathB: fileName,
                compareExtensions: false,
            }),
        );
        
        if (!file) {
            throw new Error(`Could not locate module for path: ${importPath}!`);
        }
        
        const [modulePath, exports] = file;
        
        return { modulePath, exports };
    }
    
    public get mainModule(): PackageModuleExports {
        if (!this.mainModulePath) {
            return {
                modulePath: '',
                exports: [],
            }
        }
        
        const [
            node_modules,
            meteor,
            packageName,
            ...filePath
        ] = this.mainModulePath.replace(/^\/+/g, '').split('/');
        
        const modulePath = filePath.join('/');
        const exports = this.modules[modulePath];
        
        if (!exports) {
            throw new Error(`Could not locate '${this.mainModulePath}' in parsed '${this.name}' exports`);
        }
        
        return {
            modulePath,
            exports,
        }
    }
}

type PackageModuleExports = Pick<PackageSubmodule, 'modulePath' | 'exports'>