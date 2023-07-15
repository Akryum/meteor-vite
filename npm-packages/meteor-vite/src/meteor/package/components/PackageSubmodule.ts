import pc from 'picocolors';
import Logger from '../../../Logger';
import { MeteorViteError } from '../../../vite/error/MeteorViteError';
import { ModuleExportData } from '../parser/Parser';
import ModuleExport from './ModuleExport';
import type MeteorPackage from './MeteorPackage';
import PackageExport from './PackageExport';

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
    
}

export class SerializationStore {
    protected exports = new Map<string, PackageExport | ModuleExport>;
    protected reExportWildcards = new Map<string, ModuleExport>;
    protected imports = new Map<string, PackageExport>();
    constructor() {}
    
    protected addPackageExport(entry: PackageExport) {
        const existing = this.exports.get(entry.key);
        
        if (existing) {
            return Logger.warn(`Discarded submodule entry for package export as there already is an export for it`, { existing, entry })
        }
        
        this.imports.set(entry.packageName, entry);
        this.exports.set(entry.key, entry);
    }
    
    public addEntry(entry: PackageExport | ModuleExport) {
        if (entry instanceof PackageExport) {
            return this.addPackageExport(entry);
        }
        
        if (entry.placement === 'none') {
            return;
        }
        
        if (!entry.key && !entry.from) {
            throw new MeteorViteError('Unable to determine type for module export!', { cause: entry })
        }
        
        if (!entry.key) {
            this.reExportWildcards.set(entry.from!, entry);
            return;
        }
        
        const existing = this.exports.get(entry.key);
        
        if (existing instanceof ModuleExport) {
            throw new MeteorViteError(`Duplicate module export detected in ${pc.yellow(entry.parentModule.meteorPackage.packageId)}!`, { cause: { existing, entry } })
        }
        
        this.exports.set(entry.key, entry);
    }
    
    public serialize() {
        const topLines = new Set<string>();
        const bottomLines = new Set<string>();
        const exportKeys = new Set<string>();
        
        for (const [packageName, entry] of this.imports) {
            topLines.add(entry.serializeImport());
        }
        
        for (const [path, entry] of this.reExportWildcards) {
            topLines.add(entry.serialize());
        }
        
        for (const [key, entry] of this.exports) {
            exportKeys.add(entry.key!);
            if (entry instanceof PackageExport) {
                bottomLines.add(entry.serialize());
            } else if (entry.type === 're-export') {
                topLines.add(entry.serialize())
            } else {
                bottomLines.add(entry.serialize())
            }
        }
        
        return {
            topLines: [...topLines],
            bottomLines: [...bottomLines],
            exportKeys: [...exportKeys],
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