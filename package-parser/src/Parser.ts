export default class Parser {
    constructor(protected readonly moduleContent: string | Promise<string>) {}
    
    public async getFileList() {
        return []
    }
}