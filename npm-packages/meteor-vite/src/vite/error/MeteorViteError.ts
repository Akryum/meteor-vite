import MeteorPackage from '../../meteor/package/MeteorPackage';
import ViteLoadRequest, { RequestContext } from '../ViteLoadRequest';

export class MeteorViteError extends Error {
    public viteId?: string;
    constructor(message: string, metadata?: {
        package?: Pick<MeteorPackage, 'packageId'>;
        context?: Pick<RequestContext, 'id'>;
        cause?: Error;
    }) {
        let messagePrefix = '';
        let messageSuffix = '';
        
        if (metadata?.package) {
            messagePrefix = `<${metadata.package.packageId}> \n  `
        }
        if (metadata?.cause) {
            messageSuffix = `: ${metadata.cause.message}`
        }
        
        super(`${messagePrefix}⚡  ${message}${messageSuffix}`);
        
        if (metadata?.context) {
            this.viteId = metadata.context.id;
        }
        
        if (metadata?.cause) {
            const selfStack = this.splitStack(this.stack || '');
            const otherStack = this.splitStack(metadata.cause.stack || '')?.map((line) => `  ${line}`);
            this.stack = [selfStack[1], selfStack[2], '  Caused by:', ...otherStack].join('\n');
        }
    }
    
    public setContext(loadRequest: ViteLoadRequest) {
        this.viteId = loadRequest.context.id;
    }
    
    private splitStack(stack: string) {
        return stack?.split(/[\n\r]+/);
    }
}