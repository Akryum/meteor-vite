import { inspect } from 'util';
import MeteorPackage from '../../meteor/package/MeteorPackage';
import ViteLoadRequest, { RequestContext } from '../ViteLoadRequest';


export class MeteorViteError extends Error implements ErrorMetadata {
    public package: ErrorMetadata['package'];
    public context: ErrorMetadata['context'];
    public cause: ErrorMetadata['cause'];
    public subtitle?: ErrorMetadata['subtitle'];
    protected metadataLines: string[] = [];
    
    constructor(public originalMessage?: string, { cause, context, package: meteorPackage, subtitle }: ErrorMetadata = {}) {
        super(originalMessage);
        this.subtitle = subtitle
        this.cause = cause;
        this.context = context;
        this.package = meteorPackage;
        
        if (meteorPackage) {
            this.addLine(`Package: ${meteorPackage.packageId}`)
        }
        if (context) {
            this.addLine(`File: ${context.id}`)
        }
        if (cause && !subtitle) {
            this.subtitle = `Caused by [${cause?.name}] ${cause?.message}`
        }
    }
    
    protected addLine(...lines: string[] | [string[]]) {
        if (Array.isArray(lines[0])) {
            lines = lines[0];
        }
        const whitespace = '  '
        this.metadataLines.push(`${whitespace}${lines.join(whitespace)}`);
    }
    
    public setContext(loadRequest: ViteLoadRequest) {
        this.context = loadRequest.context;
    }
    
    protected async formatLog() {
        // Used for errors that extend MeteorViteError to add additional data to the error's stack trace.
    }
    
    protected addSection(title: string, object: any) {
        const content = inspect(object, { colors: true });
        const divider = '-'.repeat(76 - title.length);
        this.addLine(`[${title}]${divider}`);
        content.split(/[\r\n]+/).forEach((line) => {
            this.addLine(`|  ${line}`)
        })
    }
    
    protected addDivider(title: string) {
        let repeatCount = 80 - title.length;
        if (repeatCount < 1) {
            return title;
        }
        return `${title}${'-'.repeat(repeatCount)}`
    }
    
    public async beautify() {
        await this.formatLog();
        
        this.name = this.addDivider(`---[${this.constructor.name}]`) + '\n';
        
        this.message = [
            `⚡   ${this.message}`,
            `-   ${this.subtitle}`,
            '',
            ...this.metadataLines!,
            '-'.repeat(80)
        ].filter((line, index) => {
            if (typeof line !== 'string') {
                return false;
            }
            if (index === 1 && !this.subtitle) { // Filter out subtitle
                return false;
            }
            return true;
        }).join('\n');
        
        this.clearProperties([
            'subtitle',
            'originalMessage',
            'package',
            'context',
            'metadataLines',
        ])
    }
    
    protected clearProperties(keys: (keyof ErrorMetadata | keyof MeteorViteError | 'metadataLines')[]) {
        keys.forEach((key) => delete this[key]);
    }
}

export interface ErrorMetadata {
    subtitle?: string;
    package?: Pick<MeteorPackage, 'packageId'>;
    context?: Pick<RequestContext, 'id'>;
    cause?: Error;
}