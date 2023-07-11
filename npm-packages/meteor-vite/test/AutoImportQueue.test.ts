import { describe, expect, it } from 'vitest';
import AutoImportQueue, { wait } from '../src/meteor/package/AutoImportQueue';
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
        
        it('handles concurrent import requests submitted at different times', async (context) => {
            const { meteorEntrypoint, template, readContent } = await AutoImportMock.useEntrypoint({
                testName: context.task.name,
                entrypoint: 'withExistingAutoImports',
            });
            
            const importRequests: Promise<void>[] = [];
            const expectedImports: string[] = [];
            
            for (let number = 0; number < 5; number++) {
                const importString = `meteor/test:staggered-import-${number}`;
                expectedImports.push(importString);
                const request = AutoImportQueue.write({
                    importString,
                    meteorEntrypoint,
                    skipRestart: true,
                });
                importRequests.push(request);
                await wait(150 * number);
            }
            
            await Promise.all(importRequests);
            const newContent = await readContent();
            
            expectedImports.forEach((importString) => expect(newContent).toContain(importString));
        })
    })
})