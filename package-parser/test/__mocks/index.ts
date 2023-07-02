import FS from 'fs/promises';
import Path from 'path';
import { ModuleList } from '../../src/Parser';


const Placeholder = {} as any;

export const TestTsModulesMock = {
    fileContent: FS.readFile(Path.join(__dirname, 'meteor-bundle/test_ts-modules.js'), 'utf-8'),
    packageName: 'test:ts-modules',
    modules: {
        'explicit-relative-path.ts': [
            { type: 'export', key: 'ExplicitRelativePath', value: Placeholder }
        ],
        'index.ts': [
            { type: 'export', key: 'first', value: Placeholder },
            { type: 'export', key: 'FIRST', value: Placeholder },
            { type: 'export', key: 'b', value: Placeholder },
            { type: 'export', key: 'c', value: Placeholder },
            { type: 'export', key: 'namedFunction', value: Placeholder },
            { type: 're-export', key: 'Meteor', value: Placeholder, fromPackage: 'meteor/meteor', id: 0 },
            { type: 're-export', key: '*', value: Placeholder, fromPackage: 'meteor/tracker', id: 1 },
            { type: 're-export', key: 'Meteor', value: Placeholder, fromPackage: 'meteor/meteor', id: 2 },
            { type: 're-export', key: 'Meteor', fromPackage: 'meteor/meteor', id: 3 },
            { type: 're-export', key: 'NamedRelativeInteger', value: Placeholder, fromPackage: './relative-module', id: 4 },
            { type: 're-export', key: '*', value: Placeholder, fromPackage: './export-star-from', id: 5 },
            { type: 'export-default', key: 'namedFunction' },
        ],
        'export-star-from.ts': [
            { type: 'export', key: 'ExportXInteger', value: Placeholder },
            { type: 'export', key: 'ExportXString', value: Placeholder },
            { type: 'export', key: 'ExportXObject', value: Placeholder }
        ],
        're-exports-index.ts': [
            { type: 're-export', key: 'DefaultReExport', value: Placeholder, fromPackage: './re-exports-source', id: 0 },
            { type: 're-export', key: 'NamedReExport', value: Placeholder, fromPackage: './re-exports-source', id: 0 },
        ],
        're-exports-source.ts': [
            { type: 'export', key: 'DefaultReExport', value: Placeholder },
            { type: 'export', key: 'NamedReExport', value: Placeholder }
        ],
        'relative-module.ts': [
            { type: 'export', key: 'NamedRelativeInteger', value: Placeholder }
        ]
    } satisfies ModuleList,
    fileNames: [
        'explicit-relative-path.ts',
        'index.ts',
        'export-star-from.ts',
        're-exports-index.ts',
        're-exports-source.ts',
        'relative-module.ts'
    ]
}