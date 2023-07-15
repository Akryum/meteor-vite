import { ModuleExportData } from '../parser/Parser';
import ModuleExport from './ModuleExport';
import type MeteorPackage from './MeteorPackage';

export class PackageSubmodule {
    
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
     * The Meteor package this submodule belongs to.
     * @type {MeteorPackage}
     */
    public readonly meteorPackage: MeteorPackage;
    
    /**
     * Full import path for the package's requested module.
     * @example
     * 'meteor/ostrio:cookies/cookie-store.js'
     */
    public get fullImportPath() {
        return `${this.meteorPackage.packageId}${this.modulePath ? `/${this.modulePath}` : ''}`
    };
    
    constructor({ meteorPackage, modulePath, exports }: PackageSubmoduleOptions) {
        this.modulePath = modulePath;
        this.meteorPackage = meteorPackage;
        this.exports = exports.map((data) => new ModuleExport({ data, parentModule: this }));
    }
    
    public serialize() {
        const topLines: string[] = [];
        const bottomLines: string[] = [];
        const exportKeys: string[] = [];
        
        this?.exports.forEach((module) => {
            if (module.placement === 'none') {
                return;
            }
            
            if (module.key) {
                exportKeys.push(module.key);
            }
            
            const line = module.serialize();
            
            if (module.placement === 'top') {
                topLines.push(line);
            }
            
            if (module.placement === 'bottom') {
                bottomLines.push(line);
            }
        });
        
        return {
            topLines,
            bottomLines,
            exportKeys,
        }
    }
}

interface PackageSubmoduleOptions {
    /**
     * ESM exports from the Meteor package module.
     * @example
     * export const foo = '...'
     */
    exports: ModuleExportData[];
    
    /**
     * Path relative to the current package to the module containing the these exports.
     * @example
     * 'meteor/ddp' // -> ''
     * 'meteor/ostrio:cookies' // -> ''
     * 'meteor/ostrio:cookies/cookie-store.js' // -> 'cookie-store.js'
     */
    modulePath: string;
    
    /**
     * Instance of the Meteor package this submodule belongs to.
     */
    meteorPackage: MeteorPackage;
}