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
        });
        
        it('adds import lines one by one during concurrent import requests', async () => {
            type AutoImportResult = { index: number, lastResolvedIndex: number, importString: string };
            let lastResolvedIndex = -1;
            const MOCK_IMPORT_COUNT = 25;
            const pendingImports: Promise<AutoImportResult>[] = [];
            const { meteorEntrypoint, template } = await AutoImportMock.useEntrypoint('withUnrelatedImports');
            
            for (let index = 0; index < MOCK_IMPORT_COUNT; index++) {
                const importString = `meteor/test:auto-imports-${index}`
                pendingImports.push(AutoImportQueue.write({
                    importString,
                    meteorEntrypoint,
                    skipRestart: true,
                }).then(() => {
                    const result: AutoImportResult = {
                        importString,
                        lastResolvedIndex,
                        index,
                    }
                    lastResolvedIndex = index;
                    return result;
                }));
            }
            
            const imports = await Promise.all(pendingImports);
            const newContent = FS.readFile(meteorEntrypoint, 'utf-8');
            
            expect(lastResolvedIndex).toEqual(MOCK_IMPORT_COUNT - 1);
            
            imports.forEach((result) => {
                expect(result.lastResolvedIndex).toEqual(result.index - 1);
                expect(newContent).toContain(`'${result.importString}'`);
            })
        })
    })
})