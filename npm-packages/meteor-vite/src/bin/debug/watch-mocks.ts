import { Check, TestLazy, TsModules } from '../../../test/__mocks';
import { parseMeteorPackage } from '../../meteor/package/Parser';
import ViteServer from './vite-server';

/**
 * Parse test module on startup for debugging and development.
 * Works well with ts-node-debug. :)
 */
(async () => {
    
    const mocks = [Check, TsModules, TestLazy];
    
    for (const { fileContent } of mocks) {
        console.log(`${'--'.repeat(64)}`)
        const result = await parseMeteorPackage({ fileContent: fileContent })
        console.log(result.modules);
    }
    
    ViteServer.then((server) => {
        server.listen(4949);
    })
})();

setInterval(() => 'Keeps the ts-node-debug process running for development', 100)