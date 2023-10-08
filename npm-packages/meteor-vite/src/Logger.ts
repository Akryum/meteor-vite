import pc from 'picocolors';

function createLogger<Params extends DefaultParams>(formatter: (...params: Params) => DefaultParams): LoggerObject<Params> {
    return {
        info: (...params: Params) => console.log(...formatMessage(formatter(...params))),
        warn: (...params: Params) => console.warn(...formatMessage(formatter(...params))),
        error: (...params: Params) => console.error(...formatMessage(formatter(...params))),
        debug: (...params: Params) => process.env.ENABLE_DEBUG_LOGS && console.debug(...formatMessage(formatter(...params))),
    }
}

function formatMessage([message, ...params]: Parameters<typeof console.log>): Parameters<typeof console.log> {
    if (typeof message === 'string') {
        return [`⚡  ${message}`, ...params];
    }
    return [message, ...params];
}
export type LoggerObject<Params extends DefaultParams> = { [key in LoggerMethods]: (...params: Params) => void };
type DefaultParams = Parameters<typeof console.log>;
type LoggerMethods = 'info' | 'warn' | 'error' | 'debug';

export const createLabelledLogger = (label: string) => createLogger((message: string, dataLines: [key: string, value: string][] | Record<string, string>) => {
    if (!Array.isArray(dataLines)) {
        dataLines = Object.entries(dataLines);
    }
    const data = dataLines.map(([key, value]) => {
        return `\n ${pc.dim('L')}  ${key}: ${value}`
    }).join('')
    
    return [`${label} ${message}${data}`]
});

export type LabelLogger = ReturnType<typeof createLabelledLogger>

export default createLogger((...params: DefaultParams) => params);
