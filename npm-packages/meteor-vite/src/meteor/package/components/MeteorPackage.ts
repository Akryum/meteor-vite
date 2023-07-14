import { MeteorViteError } from '../../../vite/error/MeteorViteError';
import { PackageSubmodule } from './PackageSubmodule';
import { parseMeteorPackage } from '../parser/Parser';
import type { ModuleList, ParsedPackage, PackageScopeExports } from '../parser/Parser';
import { isSameModulePath } from '../Serialize';

export default class MeteorPackage implements ParsedPackage {
    
    public readonly name: string;
    public readonly modules: ModuleList;
    public readonly mainModulePath?: string;
    public readonly packageScopeExports: PackageScopeExports;
    public readonly packageId: string;
    
    constructor(public readonly parsedPackage: ParsedPackage, public readonly meta: { timeSpent: string; }) {
        this.name = parsedPackage.name;
        this.modules = parsedPackage.modules;
        this.packageScopeExports = parsedPackage.packageScopeExports;
        this.mainModulePath = parsedPackage.mainModulePath;
        this.packageId = parsedPackage.packageId;
    }
    
    public static async parse(...options: Parameters<typeof parseMeteorPackage>) {
        const { result, timeSpent } = await parseMeteorPackage(...options);
        return new MeteorPackage(result, { timeSpent });
    }
    
    public getModule({ importPath }: { importPath?: string }): PackageSubmodule | undefined {
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
            throw new MeteorPackageError(`Could not locate module for path: ${importPath}!`, this);
        }
        
        const [modulePath, exports] = file;
        
        return new PackageSubmodule({ modulePath, exports, meteorPackage: this });
    }
    
    public get mainModule(): PackageSubmodule | undefined {
        if (!this.mainModulePath) {
            return;
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
            throw new MeteorPackageError(`Could not locate '${this.mainModulePath}' in package!`, this);
        }
        
        return new PackageSubmodule({
            meteorPackage: this,
            modulePath,
            exports,
        });
    }
}

class MeteorPackageError extends MeteorViteError {
    constructor(message: string, public readonly meteorPackage: MeteorPackage) {
        super(message, { package: meteorPackage });
    }
}