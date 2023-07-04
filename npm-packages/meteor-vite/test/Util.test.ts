import { describe, expect, test } from 'vitest';
import { getModuleExports } from '../src/util/Serialize';
import { TsModules } from './__mocks';

describe('Utility functions', () => {
    
    describe('get module exports from path', () => {
        test('without a file extension', () => {
            const parserResult = TsModules;
            const file = getModuleExports({
                parserResult,
                importPath: '/explicit-relative-path'
            })
            
            expect(file?.exports).toEqual(TsModules.modules['explicit-relative-path.ts'])
            expect(file?.fileName).toEqual('explicit-relative-path.ts');
        });
        
        test('with a file extension', () => {
            const parserResult = TsModules;
            const file = getModuleExports({
                parserResult,
                importPath: '/explicit-relative-path.ts'
            })
            
            expect(file?.exports).toEqual(TsModules.modules['explicit-relative-path.ts'])
            expect(file?.fileName).toEqual('explicit-relative-path.ts');
        })
    })
    
})