import { describe, expect, it } from 'vitest';
import { getModuleExports } from '../src/util/Serialize';
import { TsModules } from './__mocks';

describe('Utility functions', () => {
    
    it('can get module exports from a relative path without a file extension', () => {
        const result = TsModules;
        const file = getModuleExports({ result, importPath: '/explicit-relative-path' })
        
        expect(file?.modules).toEqual(TsModules.modules['explicit-relative-path.ts'])
        expect(file?.fileName).toEqual('explicit-relative-path.ts');
    })
})