import { PACKAGE_SCOPE_KEY } from '../StubTemplate';
import MeteorPackage from './MeteorPackage';

export default class PackageExportEntry {
    
    public readonly meteorPackage: MeteorPackage;
    public readonly key: string;
    
    constructor({ meteorPackage, key }: { meteorPackage: MeteorPackage, key: string }) {
        this.meteorPackage = meteorPackage;
        this.key = key;
    }
    
    public serialize() {
        return `export const ${this.key} = ${PACKAGE_SCOPE_KEY}.${this.key};`
    }
}