import { PackageSubmodule } from './PackageSubmodule';
import { ModuleExport } from '../Parser';
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