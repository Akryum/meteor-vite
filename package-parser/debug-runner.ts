import { parseModule, ParserResult } from './src/Parser';
import { Check, TsModules } from './test/__mocks';


/**
 * Parse test module on startup for debugging and development.
 * Works well with ts-node-dev. :)
 */
(async () => {
    
    const mocks = [Check, TsModules];
    
    for (const { fileContent } of mocks) {
        console.log(`${'--'.repeat(64)}`)
        console.log(await parseModule({ fileContent: fileContent }));
    }
    
    ViteServer.then((server) => {
        server.listen(4949);
    })
})();

setInterval(() => 'Keeps the ts-node-dev process running for development')