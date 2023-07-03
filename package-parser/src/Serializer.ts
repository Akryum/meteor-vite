import { ModuleExport } from './Parser';

export function toExport(module: ModuleExport) {
    return `export { ${module.name} ${module.as && `as ${module.as} ` || ''}} from '${module.from}'`
}