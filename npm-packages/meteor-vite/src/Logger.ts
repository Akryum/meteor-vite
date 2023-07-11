
export function CreateLogger<Params extends DefaultParams>(formatter: (...params: Params) => DefaultParams): LoggerObject<Params> {
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

export default CreateLogger((...params: DefaultParams) => params);
