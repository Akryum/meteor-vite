import FS from 'fs/promises';
import Path from 'path';
import { ModuleList } from '../../src/Parser';


const Placeholder = {} as any;

export const TestTsModulesMock = {
    fileContent: FS.readFile(Path.join(__dirname, 'meteor-bundle/test_ts-modules.js'), 'utf-8'),
    packageName: 'test:ts-modules',
    modules: {
        'explicit-relative-path.ts': [
            { type: 'export', name: 'ExplicitRelativePath', }
        ],
        'index.ts': [
            { type: 'export', name: 'first', },
            { type: 'export', name: 'FIRST', },
            { type: 'export', name: 'b', },
            { type: 'export', name: 'c', },
            { type: 'export', name: 'namedFunction', },
            { type: 're-export', name: 'Meteor', as: 'MyMeteor', from: 'meteor/meteor', id: 0 },
            { type: 're-export', name: '*', from: 'meteor/tracker', id: 1 },
            { type: 're-export', name: 'Meteor', as: 'ReExportedMeteor', from: 'meteor/meteor', id: 2 },
            
            // todo: this should not be a re-export.
            { type: 're-export', name: 'Meteor', from: 'meteor/meteor', id: 3 },
            
            { type: 're-export', name: 'NamedRelativeInteger', from: './relative-module', id: 4 },
            { type: 're-export', name: '*', from: './export-star-from', id: 5 },
            { type: 'export-default', name: 'namedFunction' },
        ],
        'export-star-from.ts': [
            { type: 'export', name: 'ExportXInteger', },
            { type: 'export', name: 'ExportXString', },
            { type: 'export', name: 'ExportXObject', }
        ],
        're-exports-index.ts': [
            { type: 're-export', name: 'DefaultReExport', from: './re-exports-source', id: 0 },
            { type: 're-export', name: 'NamedReExport', from: './re-exports-source', id: 0 },
        ],
        're-exports-source.ts': [
            { type: 'export', name: 'DefaultReExport', },
            { type: 'export', name: 'NamedReExport', }
        ],
        'relative-module.ts': [
            { type: 'export', name: 'NamedRelativeInteger', }
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