import { describe, expect, it } from 'vitest';
import { parseModule } from '../src/Parser';
import { TestTsModulesMock } from './__mocks'

describe('Meteor bundle parser', async () => {
    
    
    const parsedModule = await parseModule({
        fileContent: TestTsModulesMock.fileContent
    });
    
    it('can read the bundle file list', () => {
        expect(Object.keys(parsedModule.modules)).toEqual(TestTsModulesMock.fileNames);
    });
    
    it('can detect the package name', () => {
        expect(parsedModule.packageName).toEqual(TestTsModulesMock.packageName);
    })
    
})