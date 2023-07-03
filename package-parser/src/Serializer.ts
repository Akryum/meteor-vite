import { METEOR_STUB_KEY } from './MeteorStub';
import { ModuleExport } from './Parser';

export function exportTemplate(module: ModuleExport) {
    if (module.type === 're-export') {
        return `export { ${module.name} ${module.as && `as ${module.as} ` || ''}} from '${module.from}';`
    }
    if (module.type === 'export-default') {
        return `export default ${METEOR_STUB_KEY}.default ?? ${METEOR_STUB_KEY};`
    }
    if (module.type === 'export') {
        return `export const ${module.name} = ${METEOR_STUB_KEY}.${module.name};`
    }
    
    throw new Error('Tried to format an non-supported module export!');
}

