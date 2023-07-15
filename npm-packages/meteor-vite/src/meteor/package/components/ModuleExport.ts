import { ErrorMetadata, MeteorViteError } from '../../../vite/error/MeteorViteError';
import { PackageSubmodule } from './PackageSubmodule';
import { ModuleExportData } from '../parser/Parser';
import { METEOR_STUB_KEY } from '../StubTemplate';

export default class ModuleExport implements ModuleExport {
    public readonly parentModule: PackageSubmodule;
    public readonly from;
    public readonly as;
    public readonly type;
    public readonly name;
    public readonly id;
    
    constructor(details: { data: ModuleExportData, parentModule: PackageSubmodule }) {
        this.parentModule = details.parentModule;
        const { from, as, type, name, id } = details.data;
        this.from = from;
        this.as = as;
        this.type = type;
        this.name = name;
        this.id = id;
    }
    
    /**
     * Whether this entry needs to be placed at the top of a file, or at the bottom of a file.
     * Just so we don't end up placing `export { foo } from 'meteor/foo:bar'` statements at a place where it can
     * break syntax.
     * // If the placement is 'none', the entry should just be omitted
     *
     * In short, we want re-exports from other modules to be at the top of the file, while normal exports are left
     * at the bottom of the file.
     */
    public get placement(): 'top' | 'bottom' | 'none' {
        if (this.type === 're-export' && this.from) {
            return 'top'
        }
        if (this.type === 'global-binding') {
            return 'none'
        }
        return 'bottom';
    }
    
    /**
     * Determine the export type to be used within a stub template for the current export.
     */
    public get stubType(): ModuleExport['type'] | 'export-all' {
        
        // Standard exports
        if (this.type === 'export') {
            if (this.name === 'default') {
                return 'export-default' as const
            }
            return 'export' as const
        }
        
        if (this.type === 'export-default') {
            return 'export-default' as const;
        }
        
        if (this.type === 're-export') {
            
            // Wildcard re-exports
            if (this.name?.trim() === '*') {
                if (!this.as) {
                    return 'export-all' as const;
                }
                if (this.isReExportedByParent) {
                    return 'export' as const;
                }
                return 're-export' as const;
            }
            
            // Named re-exports
            if (this.isReExportedByParent) {
                return 'export' as const;
            }
            
            return 're-export' as const;
        }
        
        return this.type;
    }
    
    /**
     * The export key for the current entry.
     * Undefined if not applicable.
     *
     * @example
     * export const FooBar = '' // key is FooBar
     * export * from './somewhere' // key is undefined
     * export * as MyModule from './somewhere-else' // key is MyModule
     */
    public get key(): string | undefined  {
        if (this.as) {
            return this.as;
        }
        if (this.type === 'export-default') {
            return 'default';
        }
        if (this.type === 'export') {
            return this.name;
        }
    }
    
    /**
     * Full export path for the current export, if it is a re-export
     */
    public get exportPath() {
        if (this.type !== 're-export') {
            return;
        }
        if (this.from?.startsWith('.')) {
            return `${this.parentModule.meteorPackage.packageId}/${this.from?.replace(/^[./]+/, '')}`;
        }
        return this.from;
    }
    
    public get isReExportedByParent() {
        if (this.type !== 're-export') {
            return false;
        }
        if (this.from?.startsWith('./')) {
            return true;
        }
        return false;
    }
    
    /**
     * The current export entry, converted into JavaScript for use as a Meteor stub.
     * Essentially, converting from raw data back into JavaScript.
     */
    public serialize() {
        switch (this.stubType) {
            case 're-export':
                return `export { ${this.name} ${this.key && `as ${this.key} ` || ''}} from '${this.exportPath}';`
            case 'export':
                return `export const ${this.key} = ${METEOR_STUB_KEY}.${this.key};`
            case 'export-default':
                return `export default ${METEOR_STUB_KEY}.default ?? ${METEOR_STUB_KEY};`
            case 'export-all':
                return `export * from '${this.exportPath}';`
            case 'global-binding':
                return `/* global binding: ${this.name} */`;
        }
        
        throw new ExportEntrySerializationError(`Unexpected export classification for export: ${this.name} in ${this.parentModule.modulePath}`, { exportEntry: this })
    }
}

class ExportEntrySerializationError extends MeteorViteError {
    constructor(message: string, meta: ErrorMetadata & { exportEntry: ModuleExport }) {
        super(message, meta);
        this.addSection('Cause', meta.exportEntry);
    }
}