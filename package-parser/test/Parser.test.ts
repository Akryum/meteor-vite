import { describe, expect, it } from 'vitest';
import { ModuleExport, parseModule } from '../src/Parser';
import { exportTemplate } from '../src/Serializer';
import { TsModules } from './__mocks'

describe('Mock package: `test:ts-modules`', async () => {
    const mockModule = TsModules;
    const parsedModule = await parseModule({
        fileContent: TsModules.fileContent
    });
    
    it('parsed the package name', () => {
        expect(parsedModule.packageName).toEqual(mockModule.packageName)
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
                        it(exportTemplate(mockExport), () => {
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