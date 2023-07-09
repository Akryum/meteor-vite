import FS from 'fs/promises';
import { describe, expect, it } from 'vitest';
import AutoImportQueue from '../src/meteor/package/AutoImportQueue';
import { viteAutoImportBlock } from '../src/meteor/package/StubTemplate';
import { RefreshNeeded } from '../src/vite/ViteLoadRequest';
import { AutoImportMock, OstrioCookies, TestLazy, TsModules } from './__mocks';

describe('Package auto-imports', async () => {
    it('can add auto-imports to a module with existing content', async () => {
        const requestId = 'meteor/test:auto-imports';
        const { filePath: targetFile } = await AutoImportMock.useEntrypoint('withUnrelatedImports');
        await AutoImportQueue.write({ requestId, targetFile, write(content) {
            return viteAutoImportBlock({ id: requestId, content });
        }}).catch((error) => {
            if (error instanceof RefreshNeeded) {
                return;
            }
            throw error;
        });
        const newContent = await FS.readFile(targetFile, 'utf-8');
        
        expect(newContent).toContain(`'${requestId}'`);
    })
})