import FS from 'fs/promises';
import { describe, expect, it } from 'vitest';
import AutoImportQueue from '../src/meteor/package/AutoImportQueue';
import { viteAutoImportBlock } from '../src/meteor/package/StubTemplate';
import { AutoImportMock } from './__mocks';

describe('Package auto-imports', async () => {
    describe('With existing, unrelated content', async () => {
        
        it('can add imports', async () => {
            const { meteorEntrypoint, template } = await AutoImportMock.useEntrypoint('withUnrelatedImports');
            const importString = 'meteor/test:auto-imports';
            
            await AutoImportQueue.write({
                importString,
                meteorEntrypoint,
                skipRestart: true,
            })
            const newContent = await FS.readFile(meteorEntrypoint, 'utf-8');
            
            expect(newContent).toContain(`'${importString}'`);
        });
        
        it('does not modify original content', async () => {
            const { meteorEntrypoint, template } = await AutoImportMock.useEntrypoint('withUnrelatedImports');
            const importString = 'meteor/test:auto-imports';
            await AutoImportQueue.write({
                importString,
                meteorEntrypoint,
                skipRestart: true,
            })
            const newContent = await FS.readFile(meteorEntrypoint, 'utf-8');
            
            expect(newContent).toContain(`'${importString}'`);
            expect(newContent).toContain(template);
        })
    })
})