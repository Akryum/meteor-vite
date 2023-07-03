import FS from 'fs/promises';
import Path from 'path';
import { ModuleList } from '../../src/Parser';


const Placeholder = {} as any;

export const TestTsModulesMock = {
    fileContent: FS.readFile(Path.join(__dirname, 'meteor-bundle/test_ts-modules.js'), 'utf-8'),
    packageName: 'test:ts-modules',
    modules: {
        'explicit-relative-path.ts': [
            { type: 'export', name: 'ExplicitRelativePath', value: Placeholder }
        ],
        'index.ts': [
            { type: 'export', name: 'first', value: Placeholder },
            { type: 'export', name: 'FIRST', value: Placeholder },
            { type: 'export', name: 'b', value: Placeholder },
            { type: 'export', name: 'c', value: Placeholder },
            { type: 'export', name: 'namedFunction', value: Placeholder },
            { type: 're-export', name: 'Meteor', as: 'MyMeteor', value: Placeholder, from: 'meteor/meteor', id: 0 },
            { type: 're-export', name: '*', value: Placeholder, from: 'meteor/tracker', id: 1 },
            { type: 're-export', name: 'Meteor', as: 'ReExportedMeteor', value: Placeholder, from: 'meteor/meteor', id: 2 },
            
            // todo: this should not be a re-export.
            { type: 're-export', name: 'Meteor', from: 'meteor/meteor', id: 3 },
            
            { type: 're-export', name: 'NamedRelativeInteger', value: Placeholder, from: './relative-module', id: 4 },
            { type: 're-export', name: '*', value: Placeholder, from: './export-star-from', id: 5 },
            { type: 'export-default', name: 'namedFunction' },
        ],
        'export-star-from.ts': [
            { type: 'export', name: 'ExportXInteger', value: Placeholder },
            { type: 'export', name: 'ExportXString', value: Placeholder },
            { type: 'export', name: 'ExportXObject', value: Placeholder }
        ],
        're-exports-index.ts': [
            { type: 're-export', name: 'DefaultReExport', value: Placeholder, from: './re-exports-source', id: 0 },
            { type: 're-export', name: 'NamedReExport', value: Placeholder, from: './re-exports-source', id: 0 },
        ],
        're-exports-source.ts': [
            { type: 'export', name: 'DefaultReExport', value: Placeholder },
            { type: 'export', name: 'NamedReExport', value: Placeholder }
        ],
        'relative-module.ts': [
            { type: 'export', name: 'NamedRelativeInteger', value: Placeholder }
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