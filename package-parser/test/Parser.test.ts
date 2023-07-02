import { describe, expect, it } from 'vitest';
import Parser from '../src/Parser';
import { TestTsModulesMock } from './__mocks'

describe('Meteor bundle parser', () => {
    
    it('can read the bundle file list', async () => {
        const parser = new Parser(await TestTsModulesMock.file)
        
        await expect(parser.getFileList()).resolves.toEqual(TestTsModulesMock.files);
    })
    
})