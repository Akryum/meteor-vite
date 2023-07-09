import ViteLoadRequest, { FileRequestData } from '../../vite/ViteLoadRequest';
import { parseMeteorPackage } from './Parser';
import type { ModuleList, ParsedPackage, ModuleExport, PackageScopeExports } from './Parser';
import { isSameModulePath } from './Serialize';

export default class MeteorPackage implements ParsedPackage {
    
    public readonly name: string;
    public readonly modules: ModuleList;
    public readonly mainModulePath?: string;
    public readonly packageScopeExports: PackageScopeExports;
    
    constructor(public readonly parsedPackage: ParsedPackage, public readonly meta: { timeSpent: string; }) {
        this.name = parsedPackage.name;
        this.modules = parsedPackage.modules;
        this.packageScopeExports = parsedPackage.packageScopeExports;
        this.mainModulePath = parsedPackage.mainModulePath;
    }
    
    public static async parse(...options: Parameters<typeof parseMeteorPackage>) {
        const { result, timeSpent } = await parseMeteorPackage(...options);
        return new MeteorPackage(result, { timeSpent });
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
    
    public getSubmodule({ packageId, importPath }: GetSubmodule): PackageSubmodule {
        const { exports, modulePath } = this.getExports({ importPath });
        return {
            exports,
            packageId,
            modulePath,
            importPath: `${packageId}${modulePath ? `/${modulePath}` : ''}`,
            packageExports: this.packageScopeExports,
        }
    }
}

interface GetSubmodule {
    packageId: FileRequestData['packageId'];
    importPath: ViteLoadRequest['requestedModulePath'];
}

export interface PackageSubmodule {
    /**
     * Full import path for the package's requested module.
     * @example
     * 'ostrio:cookies/cookie-store.js'
     */
    importPath: string;
    
    /**
     * Relative path from the package name to the module containing these exports.
     * @example
     * 'cookie-store.js'
     */
    modulePath: string;
    
    /**
     * ESM exports from the Meteor package module.
     * @example
     * export const foo = '...'
     */
    exports: ModuleExport[];
    
    /**
     * Meteor package-scope exports.
     * {@link https://docs.meteor.com/api/packagejs.html#PackageAPI-export}
     * @example
     * Package.export('...')
     */
    packageExports: PackageScopeExports;
    
    /**
     * {@link FileRequestData}
     */
    packageId: FileRequestData['packageId'];
}

type PackageModuleExports = Pick<PackageSubmodule, 'modulePath' | 'exports'>