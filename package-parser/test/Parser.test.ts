import { describe, expect, it } from 'vitest';
import { parseModule } from '../src/Parser';
import { TestTsModulesMock } from './__mocks'

describe('Meteor bundle parser', () => {
    
    it('can read the bundle file list', async () => {
        const parsedModule = await parseModule({
            fileContent: TestTsModulesMock.fileContent
        });
        
        expect(parsedModule.fileList).toEqual(TestTsModulesMock.fileList);
    })
    
})