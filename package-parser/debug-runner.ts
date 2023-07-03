import { parseModule } from './src/Parser';
import ViteServer from './src/ViteServer';
import { Check, TsModules } from './test/__mocks';


/**
 * Parse test module on startup for debugging and development.
 * Works well with ts-node-dev. :)
 */
(async () => {
    console.log(`${'--'.repeat(64)}`)
    await parseModule({ fileContent: await Check.fileContent });
    
    console.log(`${'--'.repeat(64)}`)
    await parseModule({ fileContent: await TsModules.fileContent });
    
    ViteServer.then((server) => {
        server.listen(4949);
    })
})();

setInterval(() => 'Keeps the ts-node-dev process running for development')