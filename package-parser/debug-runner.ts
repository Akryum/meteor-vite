import { parseModule } from './src/Parser';
import { TestTsModulesMock } from './test/__mocks';


/**
 * Parse test module on startup for debugging and development.
 * Works well with ts-node-dev. :)
 */
(async () => {
    console.log(`${'--'.repeat(64)}`)
    
    await parseModule({ fileContent: await TestTsModulesMock.fileContent });
})();

setInterval(() => 'Keeps the ts-node-dev process running for development')