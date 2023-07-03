import { describe, expect, it } from 'vitest';
import { METEOR_STUB_KEY, PACKAGE_SCOPE_KEY, stubTemplate, TEMPLATE_GLOBAL_KEY } from '../src/MeteorStub';

describe('MeteorStub', () => {
    it('can create default export templates', () => {
        const template = stubTemplate({
            stubId: 0,
            packageId: 'meteor/exampleuser:foobar',
            moduleExports: [
                { type: 'export-default' }
            ],
            packageScopeExports: {},
        });
        expect(template).toContain(`export default ${METEOR_STUB_KEY}.default`)
    });
    
    it('can create package-scope export templates', () => {
        const template = stubTemplate({
            stubId: 0,
            packageId: 'meteor/exampleuser:foobar',
            packageScopeExports: {
                'exampleuser:foobar': ['packageScopeExport']
            },
            moduleExports: []
        });
        
        expect(template).toContain(`export const packageScopeExport`);
        expect(template).toContain(`Package['exampleuser:foobar']`);
        expect(template).not.toContain('export default');
    });
    
})