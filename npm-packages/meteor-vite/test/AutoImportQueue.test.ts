import FS from 'fs/promises';
import { describe, expect, it } from 'vitest';
import AutoImportQueue from '../src/meteor/package/AutoImportQueue';
import { viteAutoImportBlock } from '../src/meteor/package/StubTemplate';
import { AutoImportMock } from './__mocks';

describe('Package auto-imports', async () => {
    it('can add auto-imports to a module with existing content', async () => {
        const requestId = 'meteor/test:auto-imports';
        const { filePath: targetFile } = await AutoImportMock.useEntrypoint('withUnrelatedImports');
        await AutoImportQueue.write({
            requestId,
            targetFile,
            skipRestart: true,
            write: (content) => viteAutoImportBlock({ id: requestId, content }),
        })
        const newContent = await FS.readFile(targetFile, 'utf-8');
        
        expect(newContent).toContain(`'${requestId}'`);
    })
})