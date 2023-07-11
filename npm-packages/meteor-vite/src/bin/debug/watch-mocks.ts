import { Check, TestLazy, TsModules } from '../../../test/__mocks';
import MeteorPackage from '../../meteor/package/MeteorPackage';
import { MeteorViteError } from '../../vite/error/MeteorViteError';
import ViteServer from './vite-server';

/**
 * Parse test module on startup for debugging and development.
 * Works well with ts-node-debug. :)
 */
(async () => {
    
    const mocks = [Check, TsModules, TestLazy];
    
    for (const { filePath, fileContent } of mocks) {
        console.log(`${'--'.repeat(64)}`)
        const result = await MeteorPackage.parse({ filePath, fileContent })
        console.log(result.modules);
    }
    
    ViteServer.then((server) => {
        server.listen(4949);
    })
    class ViteJsonError extends MeteorViteError {
        public async formatLog() {
            this.addSection('some data',
                { ...this.package, ...this.context }
            )
        }
    }
    const error = new ViteJsonError('Test message 3', {
        subtitle: 'This is a subtitle!',
        package: {
            packageId: 'test:ts-modules',
        },
        context: {
            id: 'meteor/test:ts-modules/foo-bar.ts'
        },
    });
    await error.beautify()
    console.error(error);
})();

setInterval(() => 'Keeps the ts-node-debug process running for development', 100)