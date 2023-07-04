import Path from 'path';
import { describe, expect, it } from 'vitest';
import { ModuleExport, parseModule } from '../src/Parser';
import Serialize, { getMainModule } from '../src/util/Serialize';
import { Check, MeteorJs, MockModule, OstrioCookies, TestLazy, TsModules } from './__mocks';

describe('Validate known exports for mock packages', () => {
    const mockPackages: MockModule[] = [Check, TsModules, MeteorJs, TestLazy, OstrioCookies];
    
    mockPackages.forEach((mockModule) => {
        describe(mockModule.packageName, async () => {
            const parsedModule = await parseModule({ fileContent: mockModule.fileContent });
            
            it('parsed the package name', () => {
                expect(parsedModule.packageName).toEqual(mockModule.packageName)
            });
            
            it('detected the correct main module path', () => {
                expect(parsedModule.mainModulePath).toEqual(mockModule.mainModulePath);
            });
            
            it('has the correct mainModule exports', () => {
                const mainModuleExports = getMainModule(parsedModule);
                const parsedPath = Path.parse(mockModule.mainModulePath);
                const fileName = parsedPath.base as keyof typeof mockModule['modules'];
                expect(mainModuleExports).toEqual(mockModule.modules[fileName]);
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
    })
})