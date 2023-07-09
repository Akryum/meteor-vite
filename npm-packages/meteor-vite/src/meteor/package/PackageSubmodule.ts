import { FileRequestData } from '../../vite/ViteLoadRequest';
import MeteorPackage from './MeteorPackage';
import { ModuleExport, PackageScopeExports } from './Parser';

export class PackageSubmodule {
    
    /**
     * Full import path for the package's requested module.
     * @example
     * 'ostrio:cookies/cookie-store.js'
     */
    public readonly importPath: string;
    
    /**
     * Relative path from the package name to the module containing these exports.
     * @example
     * 'cookie-store.js'
     */
    public readonly modulePath: string;
    
    /**
     * ESM exports from the Meteor package module.
     * @example
     * export const foo = '...'
     */
    public readonly exports: ModuleExport[];
    
    /**
     * {@link FileRequestData}
     */
    public readonly packageId: FileRequestData['packageId'];
    
    /**
     * The Meteor package this submodule belongs to.
     * @type {MeteorPackage}
     */
    public readonly meteorPackage: MeteorPackage;
    
    constructor({ meteorPackage, importPath, packageId }: SubmoduleOptions) {
        this.meteorPackage = meteorPackage;
        this.importPath = importPath;
        this.packageId = packageId;
        
        const { modulePath, exports } = this.meteorPackage.getExports({ importPath });
        this.exports = exports;
        this.modulePath = modulePath;
    }
}

type SubmoduleOptions = { meteorPackage: MeteorPackage } & Pick<PackageSubmodule, 'importPath' | 'packageId'>