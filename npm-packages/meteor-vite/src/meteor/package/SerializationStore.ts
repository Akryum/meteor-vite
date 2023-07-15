import pc from 'picocolors';
import Logger from '../../Logger';
import { MeteorViteError } from '../../vite/error/MeteorViteError';
import ModuleExport from './components/ModuleExport';
import PackageExport from './components/PackageExport';

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
            return Logger.warn(
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
        
        if (!entry.key && !entry.from) {
            throw new MeteorViteError('Unable to determine type for module export!', { cause: entry });
        }
        
        if (!entry.key) {
            this.reExportWildcards.set(entry.from!, entry);
            return;
        }
        
        const existing = this.exports.get(entry.key);
        
        if (existing instanceof ModuleExport) {
            throw new MeteorViteError(
                `Duplicate module export detected in ${pc.yellow(entry.parentModule.meteorPackage.packageId)}!`,
                { cause: { existing, entry } },
            );
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
                topLines.add(entry.serialize());
            } else {
                bottomLines.add(entry.serialize());
            }
        }
        
        return {
            topLines: [...topLines],
            bottomLines: [...bottomLines],
            exportKeys: [...exportKeys],
        };
    }
}