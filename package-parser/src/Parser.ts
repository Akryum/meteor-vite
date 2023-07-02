import { parse } from '@babel/parser';
import { Node, traverse } from '@babel/types';

export async function parseModule(options: { fileContent: string | Promise<string> }) {
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
    
    return {
        fileList: []
    }
}

const HandlerMap: Partial<{ [key in Node['type']]: (node: Node & { type: key }) => void }> = {
    VariableDeclaration(node) {
        if (node.declarations[0].id.type !== 'Identifier') {
            return;
        }
        const name = node.declarations[0].id.name;
        
        console.log({ [name]: node })
    }
};

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