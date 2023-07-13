import PackageJson from '../../../package.json';
import { MeteorSettings } from '../Types';

declare global {
    interface Window {
        Meteor: Meteor;
    }
    
    interface Meteor {
        settings: MeteorSettings
    }
}

/**
 * Validate that the provided stub export key maps to a working export.
 * This is quite important we do. If vite:bundler doesn't properly parse a given package, its exports will just
 * silently fail and remain undefined, without any clear warning or indication as to what's going on.
 *
 * TODO: Attempt to emit a warning directly to the server console from the client. (development environment only)
 * TODO: Import, validate, and re-export wildcard re-exports.
 * TODO: Read expected 'typeof' value from package exports at the parser and compare against the expected type
 * rather than just an undefined check.
 */
export function validateStub({ stubbedPackage, exportKeys, packageName, requestId }: StubValidation) {
    if (settings.stubValidation?.ignorePackages?.includes(packageName)) {
        return;
    }
    
    console.debug('Meteor-Vite package validation:', {
        packageName,
        stubbedPackage,
        exportKeys,
    });
    
    const errors: Error[] = [];
    
    exportKeys.forEach((key) => {
        if (!stubbedPackage) {
            errors.push(new ImportException(`Was not able to import Meteor package: "${packageName}"`, {
                requestId: requestId,
                packageName,
            }))
        }
        if (typeof stubbedPackage[key] === 'undefined') {
            errors.push(new UndefinedExportException(`Could not import Meteor package into the client: export '${key}' is undefined`, {
                requestId: requestId,
                packageName,
                exportName: key,
            }))
        }
    });
    
    errors.forEach((error, i) => {
        if (settings.stubValidation?.warnOnly) {
            return console.warn(error);
        }
        if (errors.length - 1 >= i) {
            throw error;
        }
        console.error(error);
    })
    
}

const meteor: Meteor = typeof window !== 'undefined' ? window.Meteor : (global as any).Meteor
const settings = meteor?.settings?.public?.['vite:bundler'] || {};

class MeteorViteError extends Error {
    constructor(message: string, { packageName, requestId, exportName }: ErrorMetadata) {
        const footerLines = [
            `⚡ Affected package: ${packageName}`,
            `⚡ Export name: { ${exportName} }`,
            `⚡ Vite Request ID: ${requestId}`,
            '',
            `⚠️ Open an issue - it's likely an issue with meteor-vite rather than '${packageName}'`,
            `    ${PackageJson.bugs.url}`,
            '',
            `🔓  At your own risk, you can disable validation for the '${packageName}' package`,
            `    This may allow the app to continue running, but can lead to other things breaking.`,
            `    ${PackageJson.homepage}#stub-validation`,
        ].join('\n')
        
        super(message);
        this.name = `[meteor-vite] ⚠️ ${this.constructor.name}`
        this.stack += `\n\n${footerLines}`
    }
}

class ImportException extends MeteorViteError {}
class UndefinedExportException extends MeteorViteError {}

type ErrorMetadata = Pick<StubValidation, 'packageName' | 'requestId'> & { exportName?: string };

interface StubValidation {
    requestId: string;
    
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