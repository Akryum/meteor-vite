import pc from 'picocolors';
import Logger from '../../Logger';
import { MeteorViteError } from '../../vite/error/MeteorViteError';
import ModuleExport from './components/ModuleExport';
import PackageExport from './components/PackageExport';

export class SerializationStore {
    protected exports = new Map<string, PackageExport | ModuleExport>;
    protected reExportWildcards = new Map<string, ModuleExport>;
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