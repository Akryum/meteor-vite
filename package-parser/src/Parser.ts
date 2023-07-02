import { parse } from '@babel/parser';
import {
    CallExpression,
    FunctionExpression,
    Node, NumericLiteral,
    ObjectExpression,
    ObjectProperty, StringLiteral,
    traverse,
    VariableDeclaration,
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
        const startTime = Date.now();
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

    const modules: { [key in string]: ModuleExports } = {};

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
        return handleExports(args[0]);
    }
    
    // Todo: Meteor's default module export `module.exportDefault()`

    // Meteor's module declaration method. `module.link(...)`
    if (callee.property.name !== 'link') return;
    if (args[0].type !== 'StringLiteral') throw new ModuleExportsError('Expected string as the first argument in module.link()!', args[0]);
    if (args[1].type !== 'ObjectExpression') throw new ModuleExportsError('Expected ObjectExpression as the second argument in module.link()!', args[0]);
    if (args[2].type !== 'NumericLiteral') throw new ModuleExportsError('Expected NumericLiteral as the last argument in module.link()!', args[0]);

    return handleLink({
        packageName: args[0],
        exports: args[1],
        id: args[2],
    })
}

function handleLink({ packageName, exports, id }: {
    packageName: StringLiteral,
    exports: ObjectExpression,
    id: NumericLiteral,
}) {
    return exports.properties.map((property) => {
        if (property.type !== "ObjectProperty") throw new ModuleExportsError('Unexpected property type!', property);
        let key: string | undefined;
        if (property.key.type === 'Identifier') {
            key = property.key.name
        }
        if (property.key.type === 'StringLiteral') {
            key = property.key.value;
        }
        if (!key) {
            throw new ModuleExportsError('Unexpected property key type!', property)
        }

        return {
            key,
            type: 're-export',
            value: property.value,
            fromPackage: packageName.value,
            id: id.value,
        };
    });
}
function handleExports(exports: ObjectExpression) {
    return exports.properties.map((property) => {
        if (property.type !== "ObjectProperty") throw new ModuleExportsError('Unexpected property type!', property);
        if (property.key.type !== 'Identifier') throw new ModuleExportsError('Unexpected property key type!', property);

        return {
            key: property.key.name,
            type: 'export',
            value: property.value,
        };
    });
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
type ModuleExports = Required<ReturnType<typeof readModuleExports>>;

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