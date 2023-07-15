import pc from 'picocolors';
import Logger from '../../Logger';
import { ErrorMetadata, MeteorViteError } from '../../vite/error/MeteorViteError';
import ModuleExport from './components/ModuleExport';
import PackageExport from './components/PackageExport';
import { ModuleExportData, PackageScopeExports } from './parser/Parser';

/**
 * Utility class for soaking up and validating all import/export lines for a given module or package-scope export.
 * The properties here refer to the actual output within a stub.
 * Meaning, an "import" more takes the form of a reference to the global Package type.
 *
 * @example import
 * const ${PACKAGE_SCOPE_KEY} = ${TEMPLATE_GLOBAL_KEY}.Package['${this.packageName}']
 */
export class SerializationStore {
    /**
     * Collection of entries that serialize as a normal export.
     * @example input
     * export const foo = 'bar'
     * export { foo as bar } from './foo/bar'
     * export * as foobar from './foo/bar'
     *
     * @example output
     * export const foo = ${METEOR_STUB_KEY}.foo
     * export const bar = ${METEOR_STUB_KEY}.foo
     * export const foobar = ${METEOR_STUB_KEY}.foobar
     */
    protected exports = new Map<string, PackageExport | ModuleExport>;
    
    /**
     * Any export that cannot be serialized using a unique key
     * @example
     * export * from './foo/bar'
     */
    protected reExportWildcards = new Map<string, ModuleExport>;
    
    /**
     * Any named export that originates from another module.
     * @example
     * export * as FooBar from './foo/bar';
     */
    protected reExports = new Map<string, ModuleExport>;
    
    /**
     * Package imports. These do not serialize to ES imports, but rather references to the global Package type where
     * we will simulate a re-export from the given package.
     *
     * @example import
     * const ${PACKAGE_SCOPE_KEY} = ${TEMPLATE_GLOBAL_KEY}.Package['my:package']
     *
     * @example export
     * export const foo = ${PACKAGE_SCOPE_KEY}.foo
     */
    protected imports = new Map<string, PackageExport>();
    
    constructor() {
    }
    
    protected addPackageExport(entry: PackageExport) {
        const existing = this.exports.get(entry.key);
        
        if (existing) {
            return Logger.debug(
                `Discarded submodule entry for package export as there already is an export for it`,
                { existing, entry },
            );
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
        
        if (entry.stubType === 'export-all') {
            this.reExportWildcards.set(entry.from!, entry);
            return;
        }
        
        this.validateNewKey(entry);
        
        if (entry.stubType === 're-export') {
            this.reExports.set(entry.key, entry);
            return;
        }
        
        this.exports.set(entry.key, entry);
    }
    
    public validateNewKey(entry: ModuleExport): asserts entry is ModuleExport & { key: string } {
        if (!entry.key) {
            throw new MeteorViteError('Unable to determine type for module export!', { cause: entry });
        }
        
        const existing = this.exports.get(entry.key);
        const existingReExport = this.reExports.get(entry.key)
        
        if (existing instanceof ModuleExport) {
            throw new ConflictingExportKeys(
                `Duplicate module export detected in ${pc.yellow(entry.parentModule.meteorPackage.packageId)}!`,
                { conflict: { thisExport: entry, conflictedWith: existing } },
            );
        }
        if (existingReExport) {
            throw new ConflictingExportKeys(
                `Export key is conflicting with a module re-export in ${pc.yellow(entry.parentModule.meteorPackage.packageId)}!`,
                { conflict: { thisExport: entry, conflictedWith: existingReExport } },
            );
        }
    }
    
    public serialize() {
        const exports = new Set<string>;
        const reExports = new Set<string>;
        const imports = new Set<string>;
        
        this.reExports.forEach((entry) => reExports.add(entry.serialize()));
        this.reExportWildcards.forEach((entry) => reExports.add(entry.serialize()));
        
        this.imports.forEach((entry) => imports.add(entry.serializeImport()));
        this.exports.forEach((entry) => exports.add(entry.serialize()));
        
        return {
            imports: [...imports],
            reExports: [...reExports],
            exports: [...exports],
            exportKeys: [
                ...this.reExports.keys(),
                ...this.exports.keys()
            ],
        };
    }
}

export class ConflictingExportKeys extends MeteorViteError {
    constructor(
        message: string,
        public readonly meta: ErrorMetadata & {
            conflict: {
                thisExport: ModuleExport | PackageExport
                conflictedWith: ModuleExport | PackageExport;
            }
        },
    ) {
        super(message, meta);
    }
    
    protected async formatLog() {
        const { thisExport, conflictedWith } = this.meta.conflict;
        this.addSection('Conflict', {
            exportKey: thisExport.key,
        });
        this.addSection('This export', thisExport);
        this.addSection('Conflicted with', conflictedWith);
    }
}