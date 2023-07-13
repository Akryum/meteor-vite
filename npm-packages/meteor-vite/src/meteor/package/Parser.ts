import { parse } from '@babel/parser';
import {
    CallExpression, ExpressionStatement,
    FunctionExpression, Identifier, is, MemberExpression,
    Node, NumericLiteral,
    ObjectExpression, ObjectMethod,
    ObjectProperty, shallowEqual, StringLiteral,
    traverse,
} from '@babel/types';
import FS from 'fs/promises';
import { inspect } from 'util';
import Logger from '../../Logger';
import { MeteorViteError } from '../../vite/error/MeteorViteError';
import {
    KnownModuleMethodNames,
    MeteorPackageProperty,
    ModuleMethod,
    ModuleMethodName,
    MeteorInstallObject
} from "./ParserTypes";

interface ParseOptions {
    /**
     * Absolute file path to the package's JavaScript file.
     * This file needs to have been built by Meteor.
     * The package source code is not handled by the parser.
     */
    filePath: string;
    
    /**
     * Optionally use file content from memory instead of pulling the file content during parser setup.
     * Used primarily to for performance reasons in mock tests and potentially within the Vite plugin load requests.
     *
     * We still want the filePath property to maintain good traceability in error messages.
     */
    fileContent?: Promise<string> | string;
}

export async function parseMeteorPackage({ fileContent, filePath }: ParseOptions) {
    const startTime = Date.now();
    const content = (fileContent || FS.readFile(filePath, 'utf-8'))
    
    const result: ParsedPackage = await parseSource(await content);
    
    if (!result.name) {
        throw new ParserError(`Could not extract name from package in: ${filePath}`, {
            parseOptions: { fileContent, filePath },
        });
    }
    
    if (!result.packageId) {
        result.packageId = `meteor/${result.name}`;
    }
    
    const moduleExports = Object.keys(result.modules);
    const packageExports = Object.keys(result.packageScopeExports);
    
    if (!moduleExports.length && !packageExports.length) {
        console.warn(
            'Unable to retrieve any metadata from the provided source code!',
            { result }
        );
        throw new ParserError(`No modules or package-scope exports could be extracted from package: ${result.name}`);
    }
    
    return {
        result,
        timeSpent: `${Date.now() - startTime}ms`,
    }
}


function parseSource(code: string) {
    return new Promise<ParsedPackage>((resolve, reject) => {
        const source = parse(code);
        const result: ParsedPackage = {
            name: '',
            modules: {},
            packageScopeExports: {},
            mainModulePath: '',
            packageId: '',
        }
        
        traverse(source, {
            enter(node) {
                const packageScope = parsePackageScope(node);
                const meteorInstall = parseMeteorInstall(node);
                result.mainModulePath = readMainModulePath(node) || result.mainModulePath;
                
                if (meteorInstall) {
                    Object.assign(result, meteorInstall)
                }
                
                if (packageScope) {
                    result.name = result.name || packageScope.name;
                    result.packageScopeExports[packageScope.name] = packageScope.exports;
                }
            }
        });
        
        resolve(result);
    })
}

function readMainModulePath(node: Node) {
    if (node.type !== 'VariableDeclarator') return;
    if (!is('Identifier', node.id, { name: 'exports' })) return;
    if (node.init?.type !== 'CallExpression') return;
    if (!is('Identifier', node.init.callee, { name: 'require' })) return;
    if (node.init.arguments[0]?.type !== 'StringLiteral') return;
    
    // node_modules/meteor/<author>:<packageName>/<mainModule>
    return node.init.arguments[0].value;
}


function parsePackageScope(node: Node) {
    if (node.type !== 'CallExpression') return;
    if (node.callee.type !== 'MemberExpression') return;
    const { object, property } = node.callee;
    if (object.type !== 'Identifier') return;
    if (object.name !== 'Package') return;
    if (property.type !== 'Identifier') return;
    if (property.name !== '_define') return;
    
    const args = {
        packageName: node.arguments[0],
        moduleExports: node.arguments[1],
        packageExports: node.arguments[2],
    }
    
    if (args.packageName.type !== 'StringLiteral') {
        throw new ModuleExportsError('Unexpected type received for package name!', args.packageName);
    }
    
    /**
     * Deals with the meteor/meteor core packages that don't use the module system.
     */
    if (!args.packageExports && args.moduleExports?.type === 'ObjectExpression') {
        args.packageExports = args.moduleExports;
    }
    
    const packageExport = {
        name: args.packageName.value,
        exports: [] as string[],
    };
    
    /**
     * Module is likely a lazy-loaded package or one that only provides side effects as there are no exports in any
     * form.
     */
    if (!args.packageExports) {
        return packageExport;
    }
    
    if (args.packageExports.type !== 'ObjectExpression') {
        throw new ModuleExportsError('Unexpected type received for package-scope exports argument!', args.packageExports);
    }
    
    args.packageExports.properties.forEach((property) => {
        if (property.type === 'SpreadElement') {
            throw new ModuleExportsError('Unexpected property type received for package-scope exports!', property)
        }
        
        packageExport.exports.push(propParser.getKey(property));
    })
    
    return packageExport;
}

function parseMeteorInstall(node: Node): Pick<ParsedPackage, 'modules' | 'name' | 'packageId'> | undefined {
    if (node.type !== 'CallExpression') return;
    if (!is('Identifier', node.callee, { name: 'meteorInstall' })) return;
    
    const packageConfig = node.arguments[0] as MeteorInstallObject;
    const node_modules = packageConfig.properties[0];
    const meteor = node_modules.value.properties[0];
    const packageName = meteor.value.properties[0];
    const packageModules = packageName.value.properties;
    const traverseModules = (properties: MeteorPackageProperty[], parentPath: string) => {
        properties.forEach((property) => {
            const path = `${parentPath}${property.key.value.toString()}`
            const exportList: ModuleExport[] = [];
            
            if (property.value.type === 'ObjectExpression') {
                return traverseModules(property.value.properties, `${path}/`);
            }
            
            modules[path] = exportList;
            
            property.value.body.body.forEach((node) => {
                const exports = readModuleExports(node);
                if (!exports) {
                    return;
                }
                exportList.push(...exports);
            });
        })
    }
    
    const modules: ModuleList = {};
    traverseModules(packageModules, '');
    
    return {
        name: packageName.key.value,
        modules,
        packageId: `${meteor.key.value}/${packageName.key.value}`
    };
}

class MeteorInstall {
    public readonly modules: { [filePath in string]: PackageModule } = {}
    public readonly packageId: string;
    public readonly name: string;
    constructor({ packageId, name }: Pick<MeteorInstall, 'packageId' | 'name'>) {
        this.packageId = packageId;
        this.name = name;
    }

    public traverseModule(properties: MeteorPackageProperty[], parentPath: string) {
        properties.forEach((property) => {
            const path = `${parentPath}${property.key.value.toString()}`
            const module = new PackageModule({ path });

            if (property.value.type === 'ObjectExpression') {
                return this.traverseModule(property.value.properties, `${path}/`);
            }

            property.value.body.body.forEach((node) => module.parse(node))
        })
    }
}

class PackageModule {
    public readonly exports: ModuleExport[] = [];
    constructor(public readonly module: { path: string }) {}

    protected isMethod<MethodName extends ModuleMethodName>(node: ModuleMethod.MethodMap[ModuleMethodName], method: MethodName): node is ModuleMethod.MethodMap[MethodName] {
        const args = node.arguments;

        if (method === 'exportDefault') {
            if (args[0].type !== 'Identifier') {
                throw new ModuleExportsError('Unexpected default export value!', node.arguments[0]);
            }
        }

        if (method === 'export') {
            if (args[0].type !== 'ObjectExpression'){
                throw new ModuleExportsError('Unexpected export type!', exports)
            }
        }

        if (method === 'link') {
            if (args[0].type !== 'StringLiteral') throw new ModuleExportsError('Expected string as the first argument in module.link()!', args[0]);

            // Module.link('./some-path') without any arguments.
            // Translates to `import './some-path' - so no exports to be found here. 👍
            if (!args[1]) return false;

            if (args[1].type !== 'ObjectExpression') {
                throw new ModuleExportsError('Expected ObjectExpression as the second argument in module.link()!', args[0]);
            }
            if (args[2]?.type !== 'NumericLiteral') {
                throw new ModuleExportsError('Expected NumericLiteral as the last argument in module.link()!', args[0])
            }
        }

        return node.callee.property.name === method;
    }

    protected shouldParse(node: Node): node is ModuleMethod.MethodMap[ModuleMethodName] {
        if (node.type !== 'CallExpression') return false;

        const callee = node.callee;

        if (callee.type !== 'MemberExpression') return false;
        if (callee.object.type !== 'Identifier') return false;
        if (!callee.object.name.match(/^module\d*$/)) return false;
        if (callee.property.type !== 'Identifier') return false;
        const calleeMethod = callee.property.name;

        if (!KnownModuleMethodNames.includes(calleeMethod as ModuleMethodName)) {
            Logger.warn(`Meteor module.${calleeMethod}(...) is not recognized by Meteor-Vite! Please open an issue to get this resolved! 🙏`)
            return false
        }

        return true;
    }

    public parse(node: Node) {
        if (!this.shouldParse(node)) return;

        if (this.isMethod(node, 'link')) {
            return this.parseLink(node);
        }

        if (this.isMethod(node, 'export')) {
            return this.parseExport(node);
        }

        if (this.isMethod(node, 'exportDefault')) {
            this.exports.push(...this.parseExportDefault(node));
            return;
        }
    }

    protected parseLink(node: ModuleMethod.Link) {
        // todo
    }

    protected parseExport(node: ModuleMethod.Export) {
        // todo
    }

    protected parseExportDefault(node: ModuleMethod.ExportDefault) {
        const args = node.arguments;
        if (args[0].type !== 'Identifier') {
            throw new ModuleExportsError('Unexpected default export value!', args[0]);
        }

        // todo: test for default exports with `export default { foo: 'bar' }`
        return [{ type: 'export-default', name: args[0].name, } satisfies ModuleExport];
    }
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
    
    // Module.link('./some-path') without any arguments.
    // Translates to `import './some-path' - so no exports to be found here. 👍
    if (!args[1]) return;
    
    if (args[1].type !== 'ObjectExpression') {
        throw new ModuleExportsError('Expected ObjectExpression as the second argument in module.link()!', args[0]);
    }
    if (args[2]?.type !== 'NumericLiteral') {
        throw new ModuleExportsError('Expected NumericLiteral as the last argument in module.link()!', args[0])
    }
    
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

class ParserError extends MeteorViteError {
    constructor(
        public originalMessage: string,
        public readonly metadata?: {
            parseOptions?: ParseOptions,
            node?: Node,
        }) {
        super(originalMessage);
    }
    
    public async formatLog() {
        const { parseOptions, node } = await this.metadata || {};
        if (parseOptions?.fileContent) {
            this.addLine([
                `// File content for: ${this.metadata?.parseOptions?.filePath}`,
                '',
                ...(await parseOptions.fileContent).split(/[\r\n]+/)
            ]);
        }
        if (node) {
            this.addLine([inspect(node)]);
        }
    }
}

class ModuleExportsError extends ParserError {
    constructor(
        public readonly message: string,
        public readonly node: Node
    ) {
        super(message, { node });
    }
}

/**
 * Meteor package-level exports.
 * {@link https://docs.meteor.com/api/packagejs.html#PackageAPI-export}
 */
export type PackageScopeExports = Record<string, string[]>;
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
          | 'global-binding' // Meteor globals. (`Meteor`, `DDP`, etc) These should likely just be excluded from the vite stubs.
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

export interface ParsedPackage {
    /**
     * Meteor Atmosphere package name.
     * E.g. ostrio:cookies, accounts-base, ddp
     */
    name: string;
    
    /**
     * List of ES modules included in this package.
     */
    modules: ModuleList;
    
    /**
     * Path to the package's mainModule as defined with `api.mainModule(...)`
     * {@link https://docs.meteor.com/api/packagejs.html}
     */
    mainModulePath?: string;
    
    /**
     * Meteor package-level exports.
     * {@link https://docs.meteor.com/api/packagejs.html#PackageAPI-export}
     */
    packageScopeExports: PackageScopeExports;
    
    /**
     * Base Atmosphere package import This is usually where we find the full package content, even for packages
     * that have multiple entry points.
     * E.g. `meteor/ostrio:cookies`, `meteor/meteor`, `meteor/vite:bundler`
     */
    packageId: string;
}