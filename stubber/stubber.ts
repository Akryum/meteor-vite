import * as babelParser from '@babel/parser';
import FS from 'fs'

// Read meteorInstall
// Get package name
// Get files

const output = babelParser.parse(FS.readFileSync('../__mocks/meteor-bundle/test_ts-modules.js', 'utf-8'))


const mainFunction = output.program.body[0].expression.callee.body;
const meteorInstall = mainFunction.body[5].declarations[0];

console.log('0'.repeat(32))
console.log({ mainFunction });
setInterval(() => 'Keep process running')