import MeteorPackage from '../../meteor/package/MeteorPackage';
import ViteLoadRequest, { RequestContext } from '../ViteLoadRequest';

export class MeteorViteError extends Error {
    public viteId?: string;
    constructor(protected readonly originalMessage: string, metadata?: ErrorMetadata) {
        let messagePrefix = '';
        let messageSuffix = '';
        
        if (metadata?.package) {
            messagePrefix = `<${metadata.package.packageId}> \n  `
        }
        if (metadata?.cause) {
            messageSuffix = `: ${metadata.cause.message}`
        }
        
        super(`${messagePrefix}⚡  ${originalMessage}${messageSuffix}`);
        this.name = this.constructor.name;
        
        if (metadata?.context) {
            this.viteId = metadata.context.id;
        }
        
        if (metadata?.cause) {
            const selfStack = this.splitStack(this.stack || '');
            const otherStack = this.splitStack(metadata.cause.stack || '')?.map((line) => `  ${line}`);
            this.stack = [selfStack[1], selfStack[2], '  Caused by:', ...otherStack].join('\n');
        }
    }
    
    protected addMetadataLines(lines: string[]) {
        const whitespace = '\n    '
        this.message = `${this.message}${whitespace}${lines.join(whitespace)}\n  ${this.constructor.name}: ${this.originalMessage}`
    }
    
    public setContext(loadRequest: ViteLoadRequest) {
        this.viteId = loadRequest.context.id;
    }
    
    private splitStack(stack: string) {
        return stack?.split(/[\n\r]+/);
    }
    
    public async formatLog() {
        // Used for errors that extend MeteorViteError to add additional data to the error's stack trace.
    }
}

export interface ErrorMetadata {
    package?: Pick<MeteorPackage, 'packageId'>;
    context?: Pick<RequestContext, 'id'>;
    cause?: Error;
}