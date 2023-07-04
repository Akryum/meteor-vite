/**
 * Validate that the provided stub export key maps to a working export.
 * This is quite important we do. If vite:meteor doesn't properly parse a given package, its exports will just
 * silently fail and remain undefined, without any clear warning or indication as to what's going on.
 *
 * TODO: Attempt to emit a warning directly to the server console from the client. (development environment only)
 * TODO: Import, validate, and re-export wildcard re-exports.
 */
export function validateStub({ stubbedPackage, exportKeys, packageName }: StubValidation) {
    if (settings.skipValidation.includes(packageName)) return;
    exportKeys.forEach((key) => {
        if (!stubbedPackage) {
            throw new MeteorViteError(`Was not able to import Meteor package: "${packageName}"`)
        }
        if (typeof stubbedPackage[key] !== 'undefined') {
            throw new MeteorViteError(`The '${key}' export from '${packageName}' is undefined! This is likely an issue with Meteor-Vite!`);
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
    skipValidation: string[];
}

class MeteorViteError extends Error {
    constructor(message: string) {
        super(`⚡ ${message}`);
        this.stack += '\n\n'
            + `📨  Use the following link to report the issue\n`;
            + `📨  https://github.com/Akryum/meteor-vite/issues`;
    }
}


interface StubValidation {
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