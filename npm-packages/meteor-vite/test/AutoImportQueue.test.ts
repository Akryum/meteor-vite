import { describe, expect, it, test } from 'vitest';
import AutoImportQueue, { wait } from '../src/meteor/package/AutoImportQueue';
import { RefreshNeeded } from '../src/vite/ViteLoadRequest';
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
    })
    
    type EntryPoints = typeof AutoImportMock['entrypoints'];
    const testCases: { entrypoint: keyof EntryPoints }[] = [
        { entrypoint: 'withExistingAutoImports' },
        { entrypoint: 'withUnrelatedImports' },
        { entrypoint: 'empty' },
    ];
    
    describe.each(testCases)('Concurrent Requests: $entrypoint', ({ entrypoint }) => {
        it('Will process staggered import requests without restarting early', async (context) => {
            const { meteorEntrypoint, template, readContent } = await AutoImportMock.useEntrypoint({
                testName: context.task.name,
                entrypoint,
            });
            
            const importRequests: Promise<void>[] = [];
            const expectedImports: string[] = [];
            const startTime = Date.now();
            
            for (let number = 0; number < 10; number++) {
                const importString = `meteor/test:staggered-import-${number}`;
                expectedImports.push(importString);
                const request = AutoImportQueue.write({
                    importString,
                    meteorEntrypoint,
                    skipRestart: false,
                });
                importRequests.push(request);
                const waitTime = 50 * number;
                
                if (waitTime > AutoImportQueue.RESTART_COUNTDOWN_MS) {
                    await wait(150);
                    continue;
                }
                
                await wait(waitTime);
            }
            
            await expect(Promise.all(importRequests)).rejects.toThrow(RefreshNeeded);
            
            const newContent = await readContent();
            const processingTime = Date.now() - startTime;
            console.log({ processingTime });
            
            expect(processingTime).toBeGreaterThan(AutoImportQueue.RESTART_COUNTDOWN_MS);
            expectedImports.forEach((importString) => expect(newContent).toContain(importString));
            
            if (entrypoint !== 'withExistingAutoImports') {
                expect(newContent).toContain(template);
            }
        }, 15_000)
    })
})