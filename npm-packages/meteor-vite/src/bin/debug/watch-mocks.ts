import { Check, TestLazy, TsModules } from '../../../test/__mocks';
import MeteorPackage from '../../meteor/package/MeteorPackage';
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
})();

setInterval(() => 'Keeps the ts-node-debug process running for development', 100)