import type MeteorPackage from './MeteorPackage';
import type { ModuleExport } from './Parser';
import { METEOR_STUB_KEY } from './StubTemplate';

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
        this.exports = exports;
        this.modulePath = modulePath;
        this.meteorPackage = meteorPackage;
    }
}

class ExportEntry implements ModuleExport {
    public readonly parentModule: PackageSubmodule;
    public readonly from;
    public readonly as;
    public readonly type;
    public readonly name;
    public readonly id;
    
    constructor(details: { entry: ModuleExport, parentModule: PackageSubmodule }) {
        this.parentModule = details.parentModule;
        const { from, as, type, name, id } = details.entry;
        this.from = from;
        this.as = as;
        this.type = type;
        this.name = name;
        this.id = id;
    }
    
    /**
     * The current export entry, converted into JavaScript for use as a Meteor stub.
     * Essentially, converting from raw data back into JavaScript.
     */
    public get serialized() {
        if (this.type === 're-export') {
            let from = this.from?.startsWith('.')
                       ? `${this.parentModule.meteorPackage.packageId}/${this.from?.replace(/^[./]+/, '')}`
                       : this.from;
            
            if (this.name?.trim() === '*' && !this.as) {
                return `export * from '${from}';`
            }
            
            return `export { ${this.name} ${this.as && `as ${this.as} ` || ''}} from '${from}';`
        }
        
        if (this.type === 'export-default' || (this.type === 'export' && this.name === 'default')) {
            return `export default ${METEOR_STUB_KEY}.default ?? ${METEOR_STUB_KEY};`
        }
        
        if (this.type === 'export') {
            return `export const ${this.name} = ${METEOR_STUB_KEY}.${this.name};`
        }
        
        throw new Error('Tried to format an non-supported module export!');
    }
}

interface PackageSubmoduleOptions {
    /**
     * ESM exports from the Meteor package module.
     * @example
     * export const foo = '...'
     */
    exports: ModuleExport[];
    
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