import Path from 'path';
import { describe, expect, it, test } from 'vitest';
import { ModuleExport, parseMeteorPackage } from '../src/meteor/package/Parser';
import Serialize from '../src/meteor/package/Serialize';
import { Check, MeteorJs, MockModule, OstrioCookies, TestLazy, TsModules } from './__mocks';

describe('Validate known exports for mock packages', () => {
    const mockPackages: MockModule[] = [Check, TsModules, MeteorJs, TestLazy, OstrioCookies];
    
    mockPackages.forEach((mockModule) => {
        describe(`meteor/${mockModule.packageName}`, async () => {
            const parsedPackage = await parseMeteorPackage({
                filePath: mockModule.filePath,
                fileContent: mockModule.fileContent,
            });
            
            it('parsed the package name', () => {
                expect(parsedPackage.name).toEqual(mockModule.packageName)
            });
            
            it('detected the correct main module path', () => {
                expect(parsedPackage.mainModulePath).toEqual(mockModule.mainModulePath);
            });
            
            it('has the correct mainModule exports', () => {
                const mainModule = parsedPackage.mainModule;
                let mockModuleExports: ModuleExport[];
                const parsedPath = Path.parse(mockModule.mainModulePath);
                const fileName = parsedPath.base as keyof typeof mockModule['modules'];
                
                if (mockModule.mainModulePath) {
                    mockModuleExports = mockModule.modules[fileName]
                } else {
                    mockModuleExports = []
                }
                
                expect(mainModule.exports).toEqual(mockModuleExports);
            })
            
            describe.runIf(mockModule.modules.length)('Package files', () => {
                Object.entries(mockModule.modules).forEach(([filePath, mockExports]: [string, ModuleExport[]]) => {
                    describe(filePath, () => {
                        const parsedExports =  parsedPackage.modules[filePath];
                        const namedMockExports = mockExports?.filter(({ type }) => type === 'export')
                        const mockReExports = mockExports?.filter(({ type }) => type === 're-export')
                        
                        
                        it('has parsed exports', () => {
                            expect(Object.keys(parsedPackage.modules)).toContain(filePath);
                            expect(parsedExports).toBeDefined();
                        });
                        
                        
                        describe.runIf(namedMockExports?.length)('Named exports', () => {
                            namedMockExports?.forEach((mockExport) => {
                                it(`export const ${mockExport.name}`, ({ expect }) => {
                                    const expectation = expect.arrayContaining([mockExport])
                                    expect(parsedExports).toEqual(expectation)
                                })
                            })
                        })
                        
                        describe.runIf(mockReExports?.length)('Re-exports', () => {
                            mockReExports?.forEach((mockExport) => {
                                test(Serialize.moduleExport(mockExport, mockModule.packageName), ({ expect }) => {
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