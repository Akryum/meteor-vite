import { describe, expect, it } from 'vitest';
import { METEOR_STUB_KEY, PACKAGE_SCOPE_KEY, stubTemplate } from '../src/meteor/package/StubTemplate';

describe('StubTemplate', () => {
    it('can create default export templates', () => {
        const template = stubTemplate({
            stubId: 0,
            requestId: '',
            packageId: 'meteor/exampleuser:foobar',
            module: {
                packageExports: {},
                importPath: '',
                modulePath: '',
                exports: [
                    { type: 'export-default', name: 'default' }
                ]
            },
        });
        expect(template).toContain(`export default ${METEOR_STUB_KEY}.default`)
    });
    
    it(`does not create a package scope export key if it isn't necessary`, () => {
        const template = stubTemplate({
            stubId: 0,
            requestId: '',
            packageId: 'meteor/exampleuser:foobar',
            module: {
                packageExports: {},
                importPath: '',
                modulePath: '',
                exports: [
                    { type: 'export-default', name: 'default' }
                ]
            },
        });
        expect(template).not.toContain(`const ${PACKAGE_SCOPE_KEY}`);
        expect(template).not.toContain(`${PACKAGE_SCOPE_KEY}.Package`);
    })
    
    it('can create package-scope export templates', () => {
        const template = stubTemplate({
            stubId: 0,
            requestId: '',
            packageId: 'meteor/exampleuser:foobar',
            module: {
                packageExports: {
                    'exampleuser:foobar': ['packageScopeExport']
                },
                importPath: '',
                modulePath: '',
                exports: []
            },
        });
        
        expect(template).toContain(`export const packageScopeExport`);
        expect(template).toContain(`Package['exampleuser:foobar']`);
        expect(template).not.toContain('export default');
    });
    
})