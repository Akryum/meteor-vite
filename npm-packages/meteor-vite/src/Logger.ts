export default {
    info: (...params: Parameters<typeof console.log>) => console.log(`⚡  `, ...params),
    warn: (...params: Parameters<typeof console.log>) => console.warn(`⚡  `, ...params),
    error: (...params: Parameters<typeof console.log>) => console.error(`⚡  `, ...params),
    debug: (...params: Parameters<typeof console.log>) => console.debug(`⚡  `, ...params),
}
