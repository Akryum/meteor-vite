import FS from 'fs/promises';
import { describe, expect, it } from 'vitest';
import AutoImportQueue from '../src/meteor/package/AutoImportQueue';
import { viteAutoImportBlock } from '../src/meteor/package/StubTemplate';
import { AutoImportMock } from './__mocks';

describe('Package auto-imports', async () => {
    describe('With existing, unrelated content', async () => {
        
        it('can add imports', async (context) => {
            const importString = 'meteor/test:can-add-imports';
            const { meteorEntrypoint, template, readContent } = await AutoImportMock.useEntrypoint({
                testName: context.task.name,
                entrypoint: 'withUnrelatedImports',
            });
            
            await AutoImportQueue.write({
                importString,
                meteorEntrypoint,
                skipRestart: true,
            })
            const newContent = await readContent();
            
            expect(newContent).toContain(`'${importString}'`);
        });
        
        it('does not modify original content', async (context) => {
            const importString = 'meteor/test:does-not-modify-original-content';
            const { meteorEntrypoint, template, readContent } = await AutoImportMock.useEntrypoint({
                testName: context.task.name,
                entrypoint: 'withUnrelatedImports',
            });
            
            await AutoImportQueue.write({
                importString,
                meteorEntrypoint,
                skipRestart: true,
            })
            const newContent = await readContent();
            
            expect(newContent).toContain(`'${importString}'`);
            expect(newContent).toContain(template);
        });
        
        it('does not add the same import twice', async (context) => {
            const importString = 'meteor/test:duplicate-import';
            const matchRegex = /meteor\/test:duplicate-import/;
            const importStrings = [importString, importString];
            
            const { meteorEntrypoint, template, readContent } = await AutoImportMock.useEntrypoint({
                testName: context.task.name,
                entrypoint: 'withUnrelatedImports',
            });
            
            const importRequests = importStrings.map((importString) => AutoImportQueue.write({
                importString,
                meteorEntrypoint,
                skipRestart: true,
            }));
            await Promise.all(importRequests);
            const newContent = await readContent();
            
            expect(newContent.match(matchRegex)?.length).toEqual(1);
        })
        
        it('adds import lines one by one during concurrent import requests', async (context) => {
            type AutoImportResult = { index: number, lastResolvedIndex: number, importString: string };
            let lastResolvedIndex = -1;
            const MOCK_IMPORT_COUNT = 25;
            const pendingImports: Promise<AutoImportResult>[] = [];
            const { meteorEntrypoint, template, readContent } = await AutoImportMock.useEntrypoint({
                testName: context.task.name,
                entrypoint: 'withUnrelatedImports',
            });
            
            for (let index = 0; index < MOCK_IMPORT_COUNT; index++) {
                const importString = `meteor/test:auto-imports-${index}`
                pendingImports.push(AutoImportQueue.write({
                    importString,
                    meteorEntrypoint,
                    skipRestart: true,
                }).then(() => {
                    console.log('Import completed for %s', importString);
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
            const newContent = await readContent()
            
            expect(lastResolvedIndex).toEqual(MOCK_IMPORT_COUNT - 1);
            
            imports.forEach((result) => {
                expect(result.lastResolvedIndex).toEqual(result.index - 1);
                expect(newContent).toContain(`'${result.importString}'`);
            })
        }, 15_000)
    })
})