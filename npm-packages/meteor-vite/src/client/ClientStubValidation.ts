/**
 * Validate that the provided stub export key maps to a working export.
 * This is quite important we do. If vite:meteor doesn't properly parse a given package, its exports will just
 * silently fail and remain undefined, without any clear warning or indication as to what's going on.
 *
 * TODO: Attempt to emit a warning directly to the server console from the client. (development environment only)
 * TODO: Import, validate, and re-export wildcard re-exports.
 */
export function validateStub({ stubbedPackage, exportKeys, packageName, viteId }: StubValidation) {
    if (settings.skipValidation?.includes(packageName)) {
        return;
    }
    
    console.debug('Meteor-Vite package validation:', {
        packageName,
        stubbedPackage,
        exportKeys,
    });
    
    exportKeys.forEach((key) => {
        if (!stubbedPackage) {
            throw new MeteorViteError(`Was not able to import Meteor package: "${packageName}"`, {
                viteId,
                packageName,
            })
        }
        if (typeof stubbedPackage[key] === 'undefined') {
            throw new MeteorViteError(`Could not import Meteor package into the client: '${key}' is undefined`, {
                viteId,
                packageName,
                exportName: key,
            });
        }
    })
}

// @ts-ignore
const meteor = typeof window !== 'undefined' ? window.Meteor : global.Meteor
const settings: MeteorViteSettings = meteor?.settings?.public?.vite?.meteor || {};


interface MeteorViteSettings {
    /**
     * list of packages to ignore export validation for.
     */
    skipValidation?: string[];
}

class MeteorViteError extends Error {
    public readonly name = '[meteor-vite] ⚠️ Error';
    constructor(message: string, { packageName, viteId, exportName }: ErrorMetadata) {
        const footerLines = [
            `⚡ Affected package: ${packageName}`,
            `⚡ Export name: { ${exportName} }`,
            `⚡ Vite loader ID: ${viteId}`,
            '',
            `⚠️ Open an issue - it's likely an issue with meteor-vite rather than '${packageName}'`,
            `    https://github.com/Akryum/meteor-vite/issues`,
            '',
            `🔓  At your own risk, you can disable validation for the '${packageName}' package`,
            `    This may allow the app to continue running, but can lead to other things breaking.`,
            '    https://github.com/Akryum/meteor-vite/blob/main/packages/vite-bundler/README.md',
        ].join('\n')
        
        super(message);
        this.stack += `\n\n${footerLines}`
    }
}

type ErrorMetadata = Pick<StubValidation, 'packageName' | 'viteId'> & { exportName?: string };

interface StubValidation {
    viteId: string;
    
    packageName: string;
    
    /**
     * Name of every export to validate for the provided stub.
     * export {}
     */
    exportKeys: string[];
    
    /**
     * The result of the stub template's require() call.
     * Can be anything.
     */
    stubbedPackage: any;
}