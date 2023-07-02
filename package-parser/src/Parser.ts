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
    traverse(tokenizedPackage, {
        enter(node) {
            const handler = HandlerMap[node.type];
            if (typeof handler !== 'function') {
                return;
            }
            
            // @ts-ignore
            handler(node);
        }
    })
    
    console.log({ timeSpent: `${Date.now() - startTime}ms` })
    
    return {
        fileList: []
    }
}

const HandlerMap: Partial<{ [key in Node['type']]: (node: Node & { type: key }) => void }> = {
    CallExpression(node: CallExpression) {
        if (typeof node.callee !== 'object') {
            return;
        }
        
        // @ts-ignore
        if (node.callee.name !== 'meteorInstall') {
            return;
        }
        
        const packageConfig = node.arguments[0] as PackageConfig;
        const node_modules = packageConfig.properties[0];
        const meteor = node_modules.value.properties[0];
        const packageName = meteor.value.properties[0];
        const modules = packageName.value.properties;
        const fileNames = modules.map((module) => module.key.value);
        
        console.log({ packageName: packageName.key.value, fileNames });
    },
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