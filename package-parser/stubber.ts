import * as babelParser from '@babel/parser';
import {
    BlockStatement,
    CallExpression,
    ExpressionStatement,
    Node,
    ParentMaps,
    VariableDeclaration,
} from '@babel/types';
// import * as BabelTypes from '@babel/types'
import FS from 'fs'

// Read meteorInstall
// Get package name
// Get files

const output = babelParser.parse(FS.readFileSync('./__mocks/meteor-bundle/test_ts-modules.js', 'utf-8'))


function canTraverse(node: Node): node is Node & { body: Node[] } {
    if (!('body' in node)) {
        return false;
    }
    
    return Array.isArray(node.body)
}

function isType<NodeType extends Node['type']>(node: Node, type: NodeType): node is Node & { type: NodeType } {
    return node.type === type;
}

function filter<TNode extends Node>(node: TNode) {
    if (!canTraverse(node)) {
        return;
    }
    
    return {
        type: <NodeType extends Node['type']>(type: NodeType) => {
            return node.body.filter((node) => isType(node, type)) as (Node & { type: NodeType })[];
        }
    }
}


const mainFunction: BlockStatement = (output.program.body[0] as any).expression.callee.body;
const meteorInstall = filter(mainFunction)?.type('VariableDeclaration')!
    .find(({ declarations }) => {
        const node = declarations[0];
        
        if (!isType(node.id, 'Identifier')) {
            return;
        }
        return node.id.name === 'meteorInstall'
    })

console.log(`${'--'.repeat(64)}`)

console.log({ meteorInstall });
setInterval(() => 'Keep process running')