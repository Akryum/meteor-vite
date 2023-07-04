import { describe, expect, it } from 'vitest';
import { ModuleExport, parseModule } from '../src/Parser';
import Serialize, { getMainModule } from '../src/util/Serialize';
import { Check, TsModules } from './__mocks';

describe('Mock package: `test:ts-modules`', async () => {
    const mockModule = TsModules;
    const parsedModule = await parseModule({
        fileContent: TsModules.fileContent
    });
    
    it('parsed the package name', () => {
        expect(parsedModule.packageName).toEqual(mockModule.packageName)
    });
    
    it('detected the correct main module path', () => {
        expect(parsedModule.mainModulePath).toEqual(mockModule.mainModulePath);
    });
    
    it('has index.ts assigned as the main module export point', () => {
        const mainModuleExports = getMainModule(parsedModule);
        expect(mainModuleExports).toEqual(mockModule.modules['index.ts']);
    })
    
    describe('Package files', () => {
        Object.entries(TsModules.modules).forEach(([filePath, mockExports]: [string, ModuleExport[]]) => {
            describe(filePath, () => {
                const parsedExports =  parsedModule.modules[filePath];
                const namedMockExports = mockExports?.filter(({ type }) => type === 'export')
                const mockReExports = mockExports?.filter(({ type }) => type === 're-export')
                
                
                it('has parsed exports', () => {
                    expect(Object.keys(parsedModule.modules)).toContain(filePath);
                    expect(parsedExports).toBeDefined();
                });
                
                
                describe('Named exports', () => {
                    namedMockExports?.forEach((mockExport) => {
                        it(`export const ${mockExport.name}`, () => {
                            const expectation = expect.arrayContaining([mockExport])
                            expect(parsedExports).toEqual(expectation)
                        })
                    })
                })
                
                describe('Re-exports', () => {
                    mockReExports?.forEach((mockExport) => {
                        it(Serialize.moduleExport(mockExport, mockModule.packageName), () => {
                            expect(parsedExports).toEqual(
                                expect.arrayContaining([mockExport])
                            )
                        })
                    })
                })
            })
        })
    })
});

describe('Mock package `check`', async () => {
    const mockModule = Check;
    const parsedModule = await parseModule({
        fileContent: mockModule.fileContent
    });
    
    it('parsed the package name', () => {
        expect(parsedModule.packageName).toEqual(mockModule.packageName)
    });
    
    it('detected the correct main module path', () => {
        expect(parsedModule.mainModulePath).toEqual(mockModule.mainModulePath);
    });
    
    it('has index.ts assigned as the main module export point', () => {
        const mainModuleExports = getMainModule(parsedModule);
        expect(mainModuleExports).toEqual(mockModule.modules['match.js']);
    })
    
    describe('Package files', () => {
        Object.entries(mockModule.modules).forEach(([filePath, mockExports]: [string, ModuleExport[]]) => {
            describe(filePath, () => {
                const parsedExports =  parsedModule.modules[filePath];
                const namedMockExports = mockExports?.filter(({ type }) => type === 'export')
                const mockReExports = mockExports?.filter(({ type }) => type === 're-export')
                
                
                it('has parsed exports', () => {
                    expect(Object.keys(parsedModule.modules)).toContain(filePath);
                    expect(parsedExports).toBeDefined();
                });
                
                
                describe('Named exports', () => {
                    namedMockExports?.forEach((mockExport) => {
                        it(`export const ${mockExport.name}`, ({ expect }) => {
                            const expectation = expect.arrayContaining([mockExport])
                            expect(parsedExports).toEqual(expectation)
                        })
                    })
                })
                
                describe('Re-exports', () => {
                    mockReExports?.forEach((mockExport) => {
                        it(Serialize.moduleExport(mockExport, mockModule.packageName), ({ expect }) => {
                            expect(parsedExports).toEqual(
                                expect.arrayContaining([mockExport])
                            )
                        })
                    })
                })
            })
        })
    })
})