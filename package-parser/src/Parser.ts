import { parse } from '@babel/parser';
import {
    CallExpression,
    FunctionExpression,
    Node,
    ObjectExpression,
    ObjectProperty, StringLiteral,
    traverse,
    VariableDeclaration,
} from '@babel/types';

export async function parseModule(options: { fileContent: string | Promise<string> }) {
    const startTime = Date.now();
    const tokenizedPackage = parse(await options.fileContent);
    let result: ReturnType<typeof parseMeteorInstall>;
    
    traverse(tokenizedPackage, {
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
            
            result = parseMeteorInstall(node)
            console.log({
                result,
                timeSpent: `${Date.now() - startTime}ms`,
            })
        }
    })
    
    console.log({ totalTimeSpent: `${Date.now() - startTime}ms` })
    
    return {
        fileList: []
    }
}

function parseMeteorInstall(node: CallExpression) {
    const packageConfig = node.arguments[0] as PackageConfig;
    const node_modules = packageConfig.properties[0];
    const meteor = node_modules.value.properties[0];
    const packageName = meteor.value.properties[0];
    const modules = packageName.value.properties;
    const fileNames = modules.map((module) => module.key.value);
    
    return { packageName: packageName.key.value, fileNames };
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