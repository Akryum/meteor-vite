import FS from 'fs/promises';
import { describe, expect, it } from 'vitest';
import AutoImportQueue from '../src/meteor/package/AutoImportQueue';
import { viteAutoImportBlock } from '../src/meteor/package/StubTemplate';
import { AutoImportMock } from './__mocks';

describe('Package auto-imports', async () => {
    describe('With existing, unrelated content', async () => {
        const { filePath: targetFile, template } = await AutoImportMock.useEntrypoint('withUnrelatedImports');
        
        it('can add imports', async () => {
            const requestId = 'meteor/test:auto-imports';
            await AutoImportQueue.write({
                importString: requestId,
                meteorEntrypoint: targetFile,
                skipRestart: true,
            })
            const newContent = await FS.readFile(targetFile, 'utf-8');
            
            expect(newContent).toContain(`'${requestId}'`);
        });
        
        it('does not modify original content', async () => {
            const requestId = 'meteor/test:auto-imports';
            await AutoImportQueue.write({
                importString: requestId,
                meteorEntrypoint: targetFile,
                skipRestart: true,
            })
            const newContent = await FS.readFile(targetFile, 'utf-8');
            
            expect(newContent).toContain(`'${requestId}'`);
            expect(newContent).toContain(template);
        })
    })
})