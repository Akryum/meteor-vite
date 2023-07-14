import { PackageSubmodule } from './PackageSubmodule';
import { ModuleExport } from '../parser/Parser';
import { METEOR_STUB_KEY } from '../StubTemplate';

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
     * Whether this entry needs to be placed at the top of a file, or at the bottom of a file.
     * Just so we don't end up placing `export { foo } from 'meteor/foo:bar'` statements at a place where it can
     * break syntax.
     *
     * In short, we want re-exports from other modules to be at the top of the file, while normal exports are left
     * at the bottom of the file.
     */
    public get placement(): 'top' | 'bottom' {
        if (this.type === 're-export' && this.from) {
            return 'top'
        }
        return 'bottom';
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
                return `export * from '${from}';`;
            }
            
            return `export { ${this.name} ${this.as && `as ${this.as} ` || ''}} from '${from}';`;
        }
        
        if (this.type === 'export-default' || (this.type === 'export' && this.name === 'default')) {
            return `export default ${METEOR_STUB_KEY}.default ?? ${METEOR_STUB_KEY};`;
        }
        
        if (this.type === 'export') {
            return `export const ${this.name} = ${METEOR_STUB_KEY}.${this.name};`;
        }
        
        throw new Error('Tried to format an non-supported module export!');
    }
}