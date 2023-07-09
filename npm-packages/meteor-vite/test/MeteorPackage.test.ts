import { describe, expect, test } from 'vitest';
import MeteorPackage from '../src/meteor/package/MeteorPackage';
import { TsModules } from './__mocks';

describe('MeteorPackage', () => {
    describe('Utility methods', () => {
        describe('get module exports from path', () => {
            
            test('without a file extension', async () => {
                const meteorPackage = await MeteorPackage.parse({
                    filePath: TsModules.filePath,
                    fileContent: TsModules.fileContent,
                });
                const file = meteorPackage.getModule({
                    importPath: '/explicit-relative-path'
                })
                
                expect(file?.exports).toEqual(TsModules.modules['explicit-relative-path.ts'])
                expect(file?.modulePath).toEqual('explicit-relative-path.ts');
            });
            
            test('with a file extension', async () => {
                const meteorPackage = await MeteorPackage.parse({
                    filePath: TsModules.filePath,
                    fileContent: TsModules.fileContent,
                });
                const file = meteorPackage.getModule({
                    importPath: '/explicit-relative-path'
                })
                
                expect(file?.exports).toEqual(TsModules.modules['explicit-relative-path.ts'])
                expect(file?.modulePath).toEqual('explicit-relative-path.ts');
            })
            
        })
    })
})