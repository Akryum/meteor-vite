import { parse } from '@babel/parser';
import { Node, traverse, VariableDeclaration } from '@babel/types';

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
    VariableDeclaration(node: VariableDeclaration) {
        if (node.declarations[0].id.type !== 'Identifier') {
            return;
        }
        const name = node.declarations[0].id.name;
        
        if (name !== 'meteorInstall') {
            return;
        }
        
        console.log({ [name]: node.declarations[0] })
    }
}

function getNamedDeclaration(node: Node) {
    if (node.type !== 'VariableDeclaration') {
        return;
    }
    
    if (node.declarations[0].id.type !== 'Identifier') {
        return;
    }
    
    if (typeof node.declarations[0].id.name !== 'undefined') {
        return;
    }
    
    return node;
}