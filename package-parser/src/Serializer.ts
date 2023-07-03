import { METEOR_STUB_KEY, PACKAGE_SCOPE_KEY, TEMPLATE_GLOBAL_KEY } from './MeteorStub';
import { ModuleExport, PackageScopeExports } from './Parser';

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

export function packageScopeTemplate(packageExports: PackageScopeExports) {
    const top: string[] = [];
    const bottom: string[] = [];
    
    const exportList = Object.entries(packageExports);
    
    exportList.forEach(([name, exports]) => {
        top.push(`const ${PACKAGE_SCOPE_KEY} = ${TEMPLATE_GLOBAL_KEY}.Package['${name}'];`);
        exports.forEach((key) => bottom.push(`export const ${key} = ${PACKAGE_SCOPE_KEY}.${key};`));
    });
    
    return {
        top: top.join('\n'),
        bottom: bottom.join('\n'),
    };
}