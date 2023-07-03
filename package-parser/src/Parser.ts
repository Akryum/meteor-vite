import { parse } from '@babel/parser';
import {
    CallExpression, Expression, ExpressionStatement,
    FunctionExpression,
    Node, NumericLiteral,
    ObjectExpression, ObjectMethod,
    ObjectProperty, PatternLike, SpreadElement, StringLiteral,
    traverse,
} from '@babel/types';

export async function parseModule(options: { fileContent: string | Promise<string> }) {
    const startTime = Date.now();
    const result = await parseSource(await options.fileContent);
    
    console.log({
        result,
        timeSpent: `${Date.now() - startTime}ms`
    });
    
    return result;
}

function parseSource(code: string) {
    return new Promise<ParserResult>((resolve, reject) => {
        const source = parse(code);
        let completed = false;
        
        traverse(source, {
            enter(node) {
                if (node.type !== 'CallExpression') {
                    return;
                }
                
                if (typeof node.callee !== 'object') {
                    return;
                }
                
                // @ts-ignore
                if (node.callee.name !== 'meteorInstall') {
                    return;
                }
                
                resolve(parseMeteorInstall(node));
                completed = true;
            }
        });
        
        if (!completed) {
            reject(new Error('Unable to parse Meteor package!'))
        }
    }).catch((error: Error) => {
        if (error instanceof ModuleExportsError) {
            console.error(error);
            throw new Error('Failed to parse source code. See previous error.')
        }
        throw error;
    })
}

function parseMeteorInstall(node: CallExpression) {
    const packageConfig = node.arguments[0] as PackageConfig;
    const node_modules = packageConfig.properties[0];
    const meteor = node_modules.value.properties[0];
    const packageName = meteor.value.properties[0];
    const packageModules = packageName.value.properties;

    const modules: ModuleList = {};

    packageModules.forEach((module) => {
        const fileName = module.key.value.toString()
        const exportList: ModuleExports = [];

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


    // Meteor's module declaration method. `module.export(...)`
    if (callee.property.name === 'export') {
        if (args[0].type !== 'ObjectExpression') throw new ModuleExportsError('Unexpected export type!', exports)
        return formatExports({
            expression: args[0]
        });
    }
    
    // Todo: Meteor's default module export `module.exportDefault()`

    // Meteor's module declaration method. `module.link(...)`
    if (callee.property.name !== 'link') return;
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
    
    getValue(property: ObjectMethod | ObjectProperty) {
        if (property.type === 'ObjectMethod') {
            return;
        }
        
        return property.value
    }
}

function formatExports({ expression, packageName, id }: {
    expression: ObjectExpression,
    packageName?: StringLiteral,
    id?: NumericLiteral,
}) {
    return expression.properties.map((property) => {
        if (property.type === "SpreadElement") throw new ModuleExportsError('Unexpected property type!', property);
        const result: {
            key?: string,
            value?: ObjectProperty['value'],
            as?: string;
            type?: 're-export' | 'export' | 'export-default' | 'global-binding';
            fromPackage?: string;
            id?: number;
        } = {
            key: propParser.getKey(property),
            value: propParser.getValue(property),
            type: 'export',
            id: id && id.value,
        }
        
        if (packageName) {
            result.type = 're-export';
            result.fromPackage = packageName.value;
        }
        
        if (result.type === 're-export' && property.type === 'ObjectMethod') {
            if (result.key === 'Meteor') {
                result.type = 'global-binding';
            } else {
                throw new ModuleExportsError(
                    'Received an unexpected re-export property type! Maybe it needs to be included in the whitelist?',
                    property,
                )
            }
        }
        
        if (result.type === 're-export' && property.type === 'ObjectProperty') {
            if (result.value?.type !== 'StringLiteral') {
                throw new ModuleExportsError('Received unsupported result type in re-export!', property);
            }
            
            if (result.value.value !== result.key) {
                result.as = result.value.value;
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

type ParserResult = ReturnType<typeof parseMeteorInstall>;
export type ModuleExports = Required<ReturnType<typeof readModuleExports>>;
export type ModuleList = { [key in string]: ModuleExports };

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