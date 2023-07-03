import { parse } from '@babel/parser';
import {
    CallExpression, ExpressionStatement,
    FunctionExpression, is, MemberExpression,
    Node, NumericLiteral,
    ObjectExpression, ObjectMethod,
    ObjectProperty, shallowEqual, StringLiteral,
    traverse,
} from '@babel/types';

export async function parseModule(options: { fileContent: string | Promise<string> }) {
    const startTime = Date.now();
    
    const result = {
        ...await parseSource(await options.fileContent),
        timeSpent: `${Date.now() - startTime}ms`
    }
    
    console.log(result)
    
    return result;
}

function parseSource(code: string) {
    type ParserResult = {
        packageName: string;
        modules: ModuleList;
        packageScopeExports: Record<string, string[]>;
    }
    return new Promise<ParserResult>((resolve, reject) => {
        const source = parse(code);
        const result: ParserResult = {
            packageName: '',
            modules: {},
            packageScopeExports: {}
        }
        
        
        traverse(source, {
            enter(node) {
                const packageScope = parsePackageScope(node);
                const meteorInstall = parseMeteorInstall(node);
                
                if (meteorInstall) {
                    Object.assign(result, meteorInstall)
                }
                
                if (packageScope) {
                    result.packageScopeExports[packageScope.name] = packageScope.exports;
                }
            }
        });
        
        if (!result.packageName || !Object.keys({ ...result.modules, ...result.packageScopeExports }).length) {
            return reject(new Error('Unable to parse Meteor package!'));
        }
        
        resolve(result);
    }).catch((error: Error) => {
        if (error instanceof ModuleExportsError) {
            console.error(error);
            throw new Error('Failed to parse source code. See previous error.')
        }
        throw error;
    })
}


function parsePackageScope(node: Node) {
    if (node.type !== 'CallExpression') return;
    if (node.callee.type !== 'MemberExpression') return;
    const { object, property } = node.callee;
    if (object.type !== 'Identifier') return;
    if (object.name !== 'Package') return;
    if (property.type !== 'Identifier') return;
    if (property.name !== '_define') return;
    
    const packageExports = node.arguments[2];
    const packageName = node.arguments[0];
    if (!packageExports) return;
    if (packageExports.type !== 'ObjectExpression') {
        throw new ModuleExportsError('Unexpected type received for package-scope exports argument!', packageExports);
    }
    if (packageName.type !== 'StringLiteral') {
        throw new ModuleExportsError('Unexpected type received for package name!', packageName);
    }
    
    const packageExport: PackageExport = {
        name: packageName.value,
        exports: [],
    };
    
    packageExports.properties.forEach((property) => {
        if (property.type === 'SpreadElement') {
            throw new ModuleExportsError('Unexpected property type received for package-scope exports!', property)
        }
        
        packageExport.exports.push(propParser.getKey(property));
    })
    
    return packageExport;
}

function parseMeteorInstall(node: Node) {
    if (node.type !== 'CallExpression') return;
    if (!is('Identifier', node.callee, { name: 'meteorInstall' })) return;
    
    const packageConfig = node.arguments[0] as PackageConfig;
    const node_modules = packageConfig.properties[0];
    const meteor = node_modules.value.properties[0];
    const packageName = meteor.value.properties[0];
    const packageModules = packageName.value.properties;

    const modules: ModuleList = {};

    packageModules.forEach((module) => {
        const fileName = module.key.value.toString()
        const exportList: ModuleExport[] = [];

        modules[fileName.toString()] = exportList;

        module.value.body.body.forEach((node) => {
            const exports = readModuleExports(node);
            if (!exports) {
                return;
            }
            exportList.push(...exports);
        });
    })

    return {
        packageName: packageName.key.value,
        modules,
    };
}

function readModuleExports(node: Node) {
    if (node.type !== 'ExpressionStatement') return;
    if (node.expression.type === 'UnaryExpression') {
        return handleMainModule(node);
    }
    if (node.expression.type !== 'CallExpression') return;
    const { callee, arguments: args } = node.expression;
    if (callee.type !== 'MemberExpression') return;
    if (callee.object.type !== 'Identifier') return;

    // Meteor's module declaration object. `module.`
    if (!callee.object.name.match(/^module\d*$/)) return;
    if (callee.property.type !== 'Identifier') return;
    const methodName = callee.property.name as 'export' | 'link' | 'exportDefault';
    
    
    if (methodName === 'exportDefault') {
        if (args[0].type !== 'Identifier') {
            throw new ModuleExportsError('Unexpected default export value!', args[0]);
        }
        
        // todo: test for default exports with `export default { foo: 'bar' }`
        return [{ type: 'export-default', name: args[0].name, } satisfies ModuleExport];
    }

    // Meteor's module declaration method. `module.export(...)`
    if (methodName === 'export') {
        if (args[0].type !== 'ObjectExpression') throw new ModuleExportsError('Unexpected export type!', exports)
        return formatExports({
            expression: args[0]
        });
    }
    
    // Meteor's module declaration method. `module.link(...)`
    if (methodName !== 'link') return;
    if (args[0].type !== 'StringLiteral') throw new ModuleExportsError('Expected string as the first argument in module.link()!', args[0]);
    if (args[1].type !== 'ObjectExpression') throw new ModuleExportsError('Expected ObjectExpression as the second argument in module.link()!', args[0]);
    if (args[2].type !== 'NumericLiteral') throw new ModuleExportsError('Expected NumericLiteral as the last argument in module.link()!', args[0]);

    return formatExports({
        packageName: args[0],
        expression: args[1],
        id: args[2],
    })
}

function handleMainModule({ expression }: ExpressionStatement) {
    if (expression.type !== 'UnaryExpression') return;
    if (expression.operator !== '!') return;
    if (expression.argument.type !== 'CallExpression') return;
    const callee = expression.argument.callee
    if (callee.type !== 'MemberExpression') return;
    if (callee.object.type !== 'FunctionExpression') return;
    
    const mainModule = callee.object.body;
    const moduleExports: ReturnType<typeof formatExports> = [];
    
    mainModule.body.forEach((node) => {
        const exports = readModuleExports(node);
        if (!exports) return;
        moduleExports.push(...exports)
    });
    
    return moduleExports;
}

const propParser = {
    getKey(property: ObjectMethod | ObjectProperty) {
        if (property.key.type === 'Identifier') {
            return property.key.name;
        }
        if (property.key.type === 'StringLiteral') {
            return property.key.value;
        }
        
        throw new ModuleExportsError('Unsupported property key type!', property);
    },
}

function formatExports({ expression, packageName, id }: {
    expression: ObjectExpression,
    packageName?: StringLiteral,
    id?: NumericLiteral,
}) {
    return expression.properties.map((property) => {
        if (property.type === "SpreadElement") throw new ModuleExportsError('Unexpected property type!', property);
        const result: ModuleExport = {
            name: propParser.getKey(property),
            type: 'export',
            ...id && { id: id.value }
        }
        
        if (packageName) {
            result.type = 're-export';
            result.from = packageName.value;
        }
        
        if (result.type === 're-export' && property.type === 'ObjectMethod') {
            result.type = 'global-binding';
        }
        
        if (result.type === 're-export' && property.type === 'ObjectProperty') {
            const content = property.value;
            if (content.type !== 'StringLiteral') {
                throw new ModuleExportsError('Received unsupported result type in re-export!', property);
            }
            
            if (content.value !== result.name) {
                result.as = content.value;
            }
        }
        
        return result;
    })
    
}

class ModuleExportsError extends Error {
    constructor(
        public readonly message: string,
        public readonly node: Node
    ) {
        super(message);
    }
}

export type ModuleList = { [key in string]: ModuleExport[] };
export type ModuleExport = {
    /**
     * "Name" of the object to be exported.
     * @example ts
     * export const <name> = '...'
     */
    name?: string,
    type: 'export' // Named export (export const fooBar = '...')
          | 're-export' // Exporting properties from another module. (export { fooBar } from './somewhere'  )
          | 'global-binding' // Meteor globals. (`Meteor`, `DDP`, etc) These should likely just be excluded from the Vite stubs.
          | 'export-default' // Default module export (export default fooBar);
    
    /**
     * Internal Meteor ID for a linked Meteor module.
     * This isn't really all that useful apart from testing.
     */
    id?: number;
    
    /**
     * The module we're re-exporting from. This only applies to re-exports.
     * @example ts
     * export { foo } from '<from>'
     */
    from?: string;
    
    /**
     * The value of the "as" keyword when exporting a module.
     * @example ts
     * export { foo as bar }
     */
    as?: string;
};

/**
 * Meteor package-level exports.
 * @link https://docs.meteor.com/api/packagejs.html#PackageAPI-export
 */
export type PackageExport = {
    name: string;
    exports: string[];
}


type KnownObjectProperty<TValue extends Pick<ObjectProperty, 'key' | 'value'>> = Omit<ObjectProperty, 'key' | 'value'> & TValue;
type KnownObjectExpression<TValue extends Pick<ObjectExpression, 'properties'>> = Omit<ObjectExpression, 'properties'> & TValue;

type PackageConfig = KnownObjectExpression<{
    properties: [KnownObjectProperty<{
        key: StringLiteral & { value: 'node_modules' }
        value: KnownObjectExpression<{
            properties: [KnownObjectProperty<{
                key: StringLiteral & { value: 'meteor' },
                value: KnownObjectExpression<{
                    properties: [KnownObjectProperty<{
                        key: StringLiteral, // Package name
                        value: KnownObjectExpression<{
                            properties: Array<KnownObjectProperty<{
                                key: StringLiteral, // File name
                                value: FunctionExpression, // Module function
                            }>>
                        }>
                    }>]
                }>
            }>]
        }>
    }>]
}>