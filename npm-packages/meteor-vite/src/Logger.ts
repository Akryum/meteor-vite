export default {
    info: (...params: Parameters<typeof console.log>) => console.log(...formatMessage(params)),
    warn: (...params: Parameters<typeof console.log>) => console.warn(...formatMessage(params)),
    error: (...params: Parameters<typeof console.log>) => console.error(...formatMessage(params)),
    debug: (...params: Parameters<typeof console.log>) => process.env.ENABLE_DEBUG_LOGS && console.debug(...formatMessage(params)),
}

function formatMessage([message, ...params]: Parameters<typeof console.log>): Parameters<typeof console.log> {
    if (typeof message === 'string') {
        return [`⚡  ${message}`, ...params];
    }
    return [message, ...params];
}
