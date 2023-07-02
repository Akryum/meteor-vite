import { describe, expect, it } from 'vitest';
import { ModuleExports, parseModule } from '../src/Parser';
import { TestTsModulesMock } from './__mocks'

describe('Mock package: `test:ts-modules`', async () => {
    const mockModule = TestTsModulesMock;
    const parsedModule = await parseModule({
        fileContent: TestTsModulesMock.fileContent
    });
    
    it('parsed the package name', () => {
        expect(parsedModule.packageName).toEqual(mockModule.packageName)
    })
    
    describe('Package files', () => {
        Object.entries(TestTsModulesMock.modules).forEach(([key, mockExports]: [string, ModuleExports]) => {
            describe(key, () => {
                const parsedExports =  parsedModule.modules[key];
                const namedMockExports = mockExports?.filter(({ type }) => type === 'export')
                const mockReExports = mockExports?.filter(({ type }) => type === 're-export')
                
                
                it('has parsed exports', () => {
                    expect(Object.keys(parsedModule.modules)).toContain(key);
                    expect(parsedExports).toBeDefined();
                });
                
                
                describe('Named exports', () => {
                    namedMockExports?.forEach((mockExport) => {
                        it(`export { ${mockExport.key} }`, () => {
                            const expectation = expect.arrayContaining(
                                [expect.objectContaining({ key: mockExport.key, type: mockExport.type })]
                            )
                            expect(parsedExports).toEqual(expectation)
                        })
                    })
                })
                
                describe('Re-exports', () => {
                    mockReExports?.forEach((mockExport) => {
                        it(`export { ${mockExport.key} } from '${mockExport.fromPackage}'`, () => {
                            const expectation = expect.arrayContaining(
                                [expect.objectContaining({
                                    key: mockExport.key,
                                    type: mockExport.type,
                                    fromPackage: mockExport.fromPackage
                                })]
                            )
                            expect(parsedExports).toEqual(expectation)
                        })
                    })
                })
            })
        })
    })
})