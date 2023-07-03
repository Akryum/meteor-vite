import { parseModule, ParserResult } from './src/Parser';
import ViteServer from './src/ViteServer';
import { Check, TsModules } from './test/__mocks';


/**
 * Parse test module on startup for debugging and development.
 * Works well with ts-node-dev. :)
 */
(async () => {
    const logResponse = (response: ParserResult) => {
        console.log(`${'--'.repeat(64)}`)
        console.log(response);
    }
    
    await parseModule({ fileContent: await Check.fileContent }).then(logResponse);
    await parseModule({ fileContent: await TsModules.fileContent }).then(logResponse);
    
    ViteServer.then((server) => {
        server.listen(4949);
    })
})();

setInterval(() => 'Keeps the ts-node-dev process running for development')