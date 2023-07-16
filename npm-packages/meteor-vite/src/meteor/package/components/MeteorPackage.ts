import Path from 'path';
import { MeteorViteError } from '../../../vite/error/MeteorViteError';
import type { ModuleList, ParsedPackage } from '../parser/Parser';
import { parseMeteorPackage } from '../parser/Parser';
import { SerializationStore } from '../SerializationStore';
import PackageExport from './PackageExport';
import { PackageSubmodule } from './PackageSubmodule';

export default class MeteorPackage implements Omit<ParsedPackage, 'packageScopeExports'> {
    
    public readonly name: string;
    public readonly modules: ModuleList;
    public readonly mainModulePath?: string;
    public readonly packageScopeExports: PackageExport[] = [];
    public readonly packageId: string;
    
    constructor(public readonly parsedPackage: ParsedPackage, public readonly meta: { timeSpent: string; }) {
        this.name = parsedPackage.name;
        this.modules = parsedPackage.modules;
        this.mainModulePath = parsedPackage.mainModulePath;
        this.packageId = parsedPackage.packageId;
        
        Object.entries(parsedPackage.packageScopeExports).forEach(([packageName, exports]) => {
            exports.forEach((key) => {
                this.packageScopeExports.push(new PackageExport({
                    packageName,
                    meteorPackage: this,
                    key,
                }));
            });
        })
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
    
    
    /**
     * Converts all exports parsed for the package into an array of JavaScript stub-related import/export lines.
     */
    public serialize({ importPath }: { importPath?: string }) {
        const store = new SerializationStore();
        
        const submodule = this.getModule({ importPath });
        
        if (submodule) {
            submodule.exports.forEach((entry) => store.addEntry(entry));
        }
        
        // Package exports are only available at the package's mainModule, so if an import path is provided,
        // we want to omit any of these exports and only use the module-specific exports
        if (!importPath) {
            this.packageScopeExports.forEach((entry) => store.addEntry(entry));
        }
        
        return store.serialize();
    }
}

/**
 * Check if the two provided module paths are the same.
 * Todo: this may end up causing issues if a package has say a "myModule.ts" and a "myModule.ts" file.
 */
const REGEX_LEADING_SLASH = /^\/+/;

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

class MeteorPackageError extends MeteorViteError {
    constructor(message: string, public readonly meteorPackage: MeteorPackage) {
        super(message, { package: meteorPackage });
    }
}