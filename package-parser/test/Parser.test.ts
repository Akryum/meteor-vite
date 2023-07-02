import { describe, expect, it } from 'vitest';
import { ModuleExports, parseModule } from '../src/Parser';
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
    });
    
    describe('Correctly parses and formats exports from "test_ts-modules.js"', () => {
        const mockModules = Object.entries(TestTsModulesMock.modules) as [string, ModuleExports][];
        
        mockModules.forEach(([key, mockExports]) => {
            describe(key, () => {
                const parsedExports =  parsedModule.modules[key];
                const namedMockExports = mockExports?.filter(({ type }) => type === 'export')
                
                
                it('was detected as a module', () => {
                    expect(Object.keys(parsedModule.modules)).toContain(key);
                    expect(parsedExports).toBeDefined();
                });
                
                
                describe('named exports', () => {
                    namedMockExports?.forEach((mockExport) => {
                        it(`${mockExport.key}`, () => {
                            const expectation = expect.arrayContaining(
                                [expect.objectContaining({ key: mockExport.key, type: mockExport.type })]
                            )
                            expect(parsedExports).toEqual(expectation)
                        })
                    })
                    it('has the expected exports', () => {
                        console.log({ module: parsedExports, mockModule: mockExports });
                    })
                })
                
                
            })
        })
    })
    
})