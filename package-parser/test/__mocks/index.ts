import FS from 'fs/promises';
import Path from 'path';

export const TestTsModulesMock = {
    file: FS.readFile(Path.join(__dirname, 'meteor-bundle/test_ts-modules.js')),
    packageName: 'test:ts-modules',
    exports: {
        // todo
    },
    files: [
        'explicit-relative-path.ts',
        'export-star-from.ts',
        're-exports-index.ts',
        're-exports-source.ts',
        'relative-module.ts'
    ]
}