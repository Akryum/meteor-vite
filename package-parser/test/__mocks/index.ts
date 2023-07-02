import FS from 'fs/promises';
import Path from 'path';

export const TestTsModulesMock = {
    fileContent: FS.readFile(Path.join(__dirname, 'meteor-bundle/test_ts-modules.js'), 'utf-8'),
    packageName: 'test:ts-modules',
    exports: {
        // todo
    },
    fileList: [
        'explicit-relative-path.ts',
        'index.ts',
        'export-star-from.ts',
        're-exports-index.ts',
        're-exports-source.ts',
        'relative-module.ts'
    ]
}